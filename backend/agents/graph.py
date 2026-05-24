import os
import sys
from typing import List, Dict, Any, Optional, TypedDict
from dotenv import load_dotenv

from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

from agents.prompts import create_model_generation_prompt, update_conversation
from agents.code_extraction import extract_final_python_code, execute_code_and_get_variable
from utils.layout import layout_powl_model

load_dotenv()

# Define the State format
class AgentState(TypedDict):
    process_description: str
    messages: List[Dict[str, str]] # History of user/assistant chat messages
    conversation_history: List[Dict[str, str]] # Conversation history passed to LLM for code generation
    code: Optional[str]
    error: Optional[str]
    iterations: int
    diagram_data: Optional[Dict[str, Any]]
    final_model: Optional[Any]
    reply: Optional[str]
    creation_mode: Optional[str]
    is_as_is: Optional[bool]
    current_nodes: Optional[List[Dict[str, Any]]]
    current_edges: Optional[List[Dict[str, Any]]]


def get_llm():
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if gemini_key:
        return ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=gemini_key,
            temperature=0.0,
            thinking={"type": "disabled"},
        )
    elif openai_key:
        return ChatOpenAI(
            model="gpt-4o",
            openai_api_key=openai_key,
            temperature=0.0
        )
    else:
        raise ValueError("Nenhuma chave de API (GEMINI_API_KEY ou OPENAI_API_KEY) foi configurada!")


def generate_code_node(state: AgentState) -> Dict[str, Any]:
    """
    Node that generates the python code defining the POWL model.
    It handles both the initial creation, self-correction, and chat-based updates.
    """
    llm = get_llm()
    iterations = state.get("iterations", 0)
    conversation = state.get("conversation_history", [])
    error = state.get("error")
    
    # 1. Check if we are self-correcting from an execution error
    if error:
        correction_prompt = (
            f"O código Python anterior falhou na execução com o seguinte erro:\n"
            f"```\n{error}\n```\n"
            f"Por favor, analise o erro e gere o código corrigido. Lembre-se de salvar o modelo final na variável 'final_model'."
        )
        conversation.append({"role": "user", "content": correction_prompt})
    
    # 2. Check if this is the first turn or if we are applying a new user chat refinement
    elif not conversation:
        # Initial model prompt
        prompt = create_model_generation_prompt(
            state["process_description"], 
            resource_aware_discovery=True,
            is_as_is=state.get("is_as_is", True),
            creation_mode=state.get("creation_mode", "text"),
            current_nodes=state.get("current_nodes")
        )
        conversation = [{"role": "user", "content": prompt}]
    
    elif len(state["messages"]) > 0 and len(conversation) > 1:
        # We have a user refinement message that has not yet been processed in LLM conversation
        # Let's get the latest user message
        last_user_message = state["messages"][-1]["content"]
        conversation = update_conversation(conversation, last_user_message)

    # Convert conversation format for langchain invocation
    langchain_messages = []
    for msg in conversation:
        if msg["role"] == "user":
            langchain_messages.append(HumanMessage(content=msg["content"]))
        else:
            langchain_messages.append(AIMessage(content=msg["content"]))

    # Call LLM
    response = llm.invoke(langchain_messages)
    response_content = response.content
    print(f"[LangGraph] LLM response length: {len(response_content)} chars")

    # Extract code
    try:
        code = extract_final_python_code(response_content)
        extracted_error = None
    except Exception as e:
        code = None
        # Se for modo texto e não achou código, é um erro. 
        # Se for entrevista, é normal não ter código nas primeiras interações.
        if state.get("creation_mode") == "interview":
            extracted_error = None
        else:
            extracted_error = f"Não foi encontrado bloco de código Python na resposta."

    # Se for modo entrevista e já extraímos código, podemos resetar o modo para texto 
    # ou apenas prosseguir.

    # Save to LLM conversation history
    conversation.append({"role": "assistant", "content": response_content})
    
    # Clean response for UI display (hide python code)
    import re
    clean_reply = re.sub(r"```[Pp]ython.*?```", "", response_content, flags=re.DOTALL)
    # Also strip generic code blocks if they contain final_model
    clean_reply = re.sub(r"```.*?final_model.*?```", "", clean_reply, flags=re.DOTALL).strip()
    
    if not clean_reply:
        clean_reply = "Fluxo gerado com sucesso! (Código Python oculto)."

    return {
        "code": code,
        "reply": clean_reply,
        "error": extracted_error,
        "conversation_history": conversation,
        "iterations": iterations + 1
    }


def execute_code_node(state: AgentState) -> Dict[str, Any]:
    """
    Node that executes the generated Python code to obtain the final_model object.
    """
    code = state.get("code")
    if not code:
        # If we didn't generate code (e.g. interview mode), we don't execute and don't fail.
        return {"error": state.get("error")}

    try:
        # Execute the python code and retrieve 'final_model'
        final_model = execute_code_and_get_variable(code, "final_model")
        return {
            "final_model": final_model,
            "error": None
        }
    except Exception as e:
        return {
            "error": str(e),
            "final_model": None
        }


def generate_layout_node(state: AgentState) -> Dict[str, Any]:
    """
    Node that converts the final POWL model to a layouted BPMN structure
    and outputs the React Flow diagram JSON.
    """
    final_model = state.get("final_model")
    code = state.get("code")
    
    if not final_model:
        return {"error": "Nenhum modelo de processo disponível para desenhar o layout."}

    try:
        diagram_data = layout_powl_model(final_model, code, state.get("current_nodes"))
        return {
            "diagram_data": diagram_data,
            "error": None
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        return {
            "error": f"Erro na geração de layout BPMN / React Flow:\n{str(e)}\nTraceback:\n{tb}"
        }


def should_continue(state: AgentState) -> str:
    """
    Decides whether to execute the code or stop.
    If there is no code (interview mode asking questions), we stop.
    If there is an error but we haven't reached iteration limit, we retry.
    """
    if not state.get("code") and not state.get("error"):
        return "end" # Interview mode waiting for user reply
    if state.get("error") and state.get("iterations") < 3:
        return "generate_code"
    if state.get("code") and not state.get("error"):
        return "generate_layout"
    return "end"


# Build the Graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("generate_code", generate_code_node)
workflow.add_node("execute_code", execute_code_node)
workflow.add_node("generate_layout", generate_layout_node)

# Set entry point
workflow.set_entry_point("generate_code")

# Add edges
workflow.add_edge("generate_code", "execute_code")

# Add conditional edge from execute_code
workflow.add_conditional_edges(
    "execute_code",
    should_continue,
    {
        "generate_code": "generate_code",
        "generate_layout": "generate_layout",
        "end": END
    }
)

workflow.add_edge("generate_layout", END)

# Compile
app_graph = workflow.compile()


def run_agent_workflow(
    process_description: str, 
    messages: List[Dict[str, str]] = None, 
    conversation_history: List[Dict[str, str]] = None,
    creation_mode: str = "text",
    is_as_is: bool = True,
    current_nodes: List[Dict[str, Any]] = None,
    current_edges: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    
    initial_state = {
        "process_description": process_description,
        "messages": messages or [],
        "conversation_history": conversation_history or [],
        "iterations": 0,
        "creation_mode": creation_mode,
        "is_as_is": is_as_is,
        "current_nodes": current_nodes,
        "current_edges": current_edges,
        "code": None,
        "error": None,
        "diagram_data": None,
        "final_model": None
    }
    
    result = app_graph.invoke(initial_state)
    return result
