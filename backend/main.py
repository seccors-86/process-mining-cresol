import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import engine, get_db
from agents.graph import run_agent_workflow
from utils.document import generate_process_document
from utils.bpmn_export import generate_bpmn_xml

# Initialize database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cresol Process Mining API",
    description="Backend service powered by FastAPI & LangGraph for process modeling and visual layout mapping.",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class DiagramBase(BaseModel):
    title: str
    description: Optional[str] = None
    powl_code: Optional[str] = None
    xml_data: Optional[str] = None
    json_data: Optional[Dict[str, Any]] = None
    notes: Optional[Dict[str, str]] = None

class DiagramCreate(DiagramBase):
    pass

class DiagramUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    powl_code: Optional[str] = None
    xml_data: Optional[str] = None
    json_data: Optional[Dict[str, Any]] = None
    notes: Optional[Dict[str, str]] = None

class DiagramResponse(DiagramBase):
    id: int
    created_at: Any
    updated_at: Any

    class Config:
        from_attributes = True

class AreaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#f8fafc"

class AreaResponse(AreaCreate):
    id: int
    class Config:
        from_attributes = True

class SystemCreate(BaseModel):
    name: str
    description: Optional[str] = None

class SystemResponse(SystemCreate):
    id: int
    class Config:
        from_attributes = True

class VariableCreate(BaseModel):
    name: str
    description: Optional[str] = None

class VariableResponse(VariableCreate):
    id: int
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    process_description: str
    messages: List[Dict[str, str]]
    conversation_history: List[Dict[str, str]]
    creation_mode: Optional[str] = "text"
    is_as_is: Optional[bool] = True
    current_nodes: Optional[List[Dict[str, Any]]] = None
    current_edges: Optional[List[Dict[str, Any]]] = None

class DocumentExportRequest(BaseModel):
    title: str
    description: Optional[str] = None
    json_data: Dict[str, Any]
    notes: Optional[Dict[str, str]] = None
    powl_code: Optional[str] = None

class BPMNExportRequest(BaseModel):
    title: str
    json_data: Dict[str, Any]


# --- API Routes ---

@app.get("/")
def read_root():
    return {"status": "running", "service": "Cresol Process Mining Platform API"}


# 1. Diagram Management (CRUD)
@app.get("/api/diagrams", response_model=List[DiagramResponse])
def list_diagrams(db: Session = Depends(get_db)):
    diagrams = db.query(models.DiagramModel).order_by(models.DiagramModel.updated_at.desc()).all()
    return diagrams

@app.get("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
def get_diagram(diagram_id: int, db: Session = Depends(get_db)):
    diagram = db.query(models.DiagramModel).filter(models.DiagramModel.id == diagram_id).first()
    if not diagram:
        raise HTTPException(status_code=404, detail="Diagrama não encontrado.")
    return diagram

@app.post("/api/diagrams", response_model=DiagramResponse, status_code=status.HTTP_201_CREATED)
def create_diagram(diagram: DiagramCreate, db: Session = Depends(get_db)):
    db_diagram = models.DiagramModel(
        title=diagram.title,
        description=diagram.description,
        powl_code=diagram.powl_code,
        xml_data=diagram.xml_data,
        json_data=diagram.json_data,
        notes=diagram.notes
    )
    db.add(db_diagram)
    db.commit()
    db.refresh(db_diagram)
    return db_diagram

@app.put("/api/diagrams/{diagram_id}", response_model=DiagramResponse)
def update_diagram(diagram_id: int, diagram_update: DiagramUpdate, db: Session = Depends(get_db)):
    db_diagram = db.query(models.DiagramModel).filter(models.DiagramModel.id == diagram_id).first()
    if not db_diagram:
        raise HTTPException(status_code=404, detail="Diagrama não encontrado.")
    
    update_data = diagram_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_diagram, key, value)
        
    db.commit()
    db.refresh(db_diagram)
    return db_diagram

@app.delete("/api/diagrams/{diagram_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diagram(diagram_id: int, db: Session = Depends(get_db)):
    db_diagram = db.query(models.DiagramModel).filter(models.DiagramModel.id == diagram_id).first()
    if not db_diagram:
        raise HTTPException(status_code=404, detail="Diagrama não encontrado.")
    
    db.delete(db_diagram)
    db.commit()
    return None


# 4. Areas Management
@app.get("/api/areas", response_model=List[AreaResponse])
def list_areas(db: Session = Depends(get_db)):
    return db.query(models.Area).order_by(models.Area.name.asc()).all()

@app.post("/api/areas", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
def create_area(area: AreaCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Area).filter(models.Area.name == area.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Área já cadastrada.")
    db_area = models.Area(name=area.name, description=area.description, color=area.color)
    db.add(db_area)
    db.commit()
    db.refresh(db_area)
    return db_area

@app.put("/api/areas/{area_id}", response_model=AreaResponse)
def update_area(area_id: int, area_update: AreaCreate, db: Session = Depends(get_db)):
    db_area = db.query(models.Area).filter(models.Area.id == area_id).first()
    if not db_area:
        raise HTTPException(status_code=404, detail="Área não encontrada.")
    db_area.name = area_update.name
    db_area.description = area_update.description
    db_area.color = area_update.color
    db.commit()
    db.refresh(db_area)
    return db_area

@app.delete("/api/areas/{area_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_area(area_id: int, db: Session = Depends(get_db)):
    db_area = db.query(models.Area).filter(models.Area.id == area_id).first()
    if not db_area:
        raise HTTPException(status_code=404, detail="Área não encontrada.")
    db.delete(db_area)
    db.commit()
    return None

# 5. Systems Management
@app.get("/api/systems", response_model=List[SystemResponse])
def list_systems(db: Session = Depends(get_db)):
    return db.query(models.SystemModel).order_by(models.SystemModel.name.asc()).all()

@app.post("/api/systems", response_model=SystemResponse, status_code=status.HTTP_201_CREATED)
def create_system(sys: SystemCreate, db: Session = Depends(get_db)):
    existing = db.query(models.SystemModel).filter(models.SystemModel.name == sys.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Sistema já cadastrado.")
    db_sys = models.SystemModel(name=sys.name, description=sys.description)
    db.add(db_sys)
    db.commit()
    db.refresh(db_sys)
    return db_sys

@app.put("/api/systems/{sys_id}", response_model=SystemResponse)
def update_system(sys_id: int, sys_update: SystemCreate, db: Session = Depends(get_db)):
    db_sys = db.query(models.SystemModel).filter(models.SystemModel.id == sys_id).first()
    if not db_sys:
        raise HTTPException(status_code=404, detail="Sistema não encontrado.")
    db_sys.name = sys_update.name
    db_sys.description = sys_update.description
    db.commit()
    db.refresh(db_sys)
    return db_sys

@app.delete("/api/systems/{sys_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_system(sys_id: int, db: Session = Depends(get_db)):
    db_sys = db.query(models.SystemModel).filter(models.SystemModel.id == sys_id).first()
    if not db_sys:
        raise HTTPException(status_code=404, detail="Sistema não encontrado.")
    db.delete(db_sys)
    db.commit()
    return None

# 6. Variables Management
@app.get("/api/variables", response_model=List[VariableResponse])
def list_variables(db: Session = Depends(get_db)):
    return db.query(models.VariableModel).order_by(models.VariableModel.name.asc()).all()

@app.post("/api/variables", response_model=VariableResponse, status_code=status.HTTP_201_CREATED)
def create_variable(var: VariableCreate, db: Session = Depends(get_db)):
    existing = db.query(models.VariableModel).filter(models.VariableModel.name == var.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Variável já cadastrada.")
    db_var = models.VariableModel(name=var.name, description=var.description)
    db.add(db_var)
    db.commit()
    db.refresh(db_var)
    return db_var

@app.put("/api/variables/{var_id}", response_model=VariableResponse)
def update_variable(var_id: int, var_update: VariableCreate, db: Session = Depends(get_db)):
    db_var = db.query(models.VariableModel).filter(models.VariableModel.id == var_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variável não encontrada.")
    db_var.name = var_update.name
    db_var.description = var_update.description
    db.commit()
    db.refresh(db_var)
    return db_var

@app.delete("/api/variables/{var_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_variable(var_id: int, db: Session = Depends(get_db)):
    db_var = db.query(models.VariableModel).filter(models.VariableModel.id == var_id).first()
    if not db_var:
        raise HTTPException(status_code=404, detail="Variável não encontrada.")
    db.delete(db_var)
    db.commit()
    return None

@app.post("/api/upload-log")
async def upload_log(file: UploadFile = File(...)):
    """
    Reads a CSV or Excel file (Event Log), calculates basic transition frequencies,
    and returns a textual summary to be appended to the AI's prompt.
    """
    import pandas as pd
    import io
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
            
        # Try to find standard columns: Case ID, Activity
        case_col = next((c for c in df.columns if 'case' in c.lower() or 'id' in c.lower() or 'chamado' in c.lower() or 'processo' in c.lower()), None)
        act_col = next((c for c in df.columns if 'activity' in c.lower() or 'atividade' in c.lower() or 'etapa' in c.lower() or 'status' in c.lower()), None)
        
        if not case_col or not act_col:
            summary = f"O arquivo possui as colunas: {', '.join(df.columns)}. \n"
            summary += "Não foi possível identificar automaticamente as colunas de 'ID do Caso' e 'Atividade'.\n"
            summary += "Por favor, defina o processo com base nas informações disponíveis."
            return {"summary": summary}
            
        # Basic directly-follows abstraction
        df = df.sort_values(by=[case_col])
        activities = df[act_col].unique().tolist()
        
        summary = f"Atividades encontradas ({len(activities)}):\n" + ", ".join([str(a) for a in activities]) + "\n\n"
        
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 3. LangGraph AI Chat Agent Loop
@app.post("/api/agents/chat")
def chat_agent(request: ChatRequest):
    """
    Executes the LangGraph agent workflow loop.
    It takes the description, current message sequence and conversation history,
    computes/corrects code, and returns structured layout + messages.
    """
    try:
        result = run_agent_workflow(
            process_description=request.process_description,
            messages=request.messages,
            conversation_history=request.conversation_history,
            creation_mode=request.creation_mode,
            is_as_is=request.is_as_is,
            current_nodes=request.current_nodes,
            current_edges=request.current_edges
        )
        
        # Format response
        return {
            "code": result.get("code"),
            "reply": result.get("reply"),
            "conversation_history": result.get("conversation_history"),
            "diagram_data": result.get("diagram_data")
        }
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Erro durante a execução do agente LangGraph: {str(e)}\n\n{tb}"
        )


# 4. Process Documentation Exporter (.docx)
@app.post("/api/export-word")
def export_document(request: DocumentExportRequest):
    """
    Compiles diagram activities, swimlanes, and annotations into a downloadable Word (.docx) file.
    """
    try:
        file_stream = generate_process_document(
            diagram_title=request.title,
            description=request.description,
            react_flow_data=request.json_data,
            notes=request.notes or {},
            powl_code=request.powl_code or "",
            simplified=False
        )
        
        headers = {
            'Content-Disposition': f'attachment; filename="documentacao_processo_{request.title.replace(" ", "_")}.docx"'
        }
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar a documentação em Word: {str(e)}"
        )

@app.post("/api/export-word-simplified")
def export_document_simplified(request: DocumentExportRequest):
    """
    Compiles a simplified version of the Word (.docx) file.
    """
    try:
        file_stream = generate_process_document(
            diagram_title=request.title,
            description=request.description,
            react_flow_data=request.json_data,
            notes=request.notes or {},
            powl_code=request.powl_code or "",
            simplified=True
        )
        
        headers = {
            'Content-Disposition': f'attachment; filename="documentacao_processo_{request.title.replace(" ", "_")}_Simplificado.docx"'
        }
        return StreamingResponse(
            file_stream,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar a documentação simplificada em Word: {str(e)}"
        )

# 5. Process BPMN Exporter
@app.post("/api/export-bpmn")
def export_bpmn(request: BPMNExportRequest):
    """
    Converts diagram to BPMN 2.0 XML with Diagram Interchange (BPMNDI) for tool import.
    """
    try:
        xml_string = generate_bpmn_xml(
            title=request.title,
            react_flow_data=request.json_data
        )
        
        import io
        file_stream = io.BytesIO(xml_string.encode('utf-8'))
        file_stream.seek(0)

        headers = {
            'Content-Disposition': f'attachment; filename="{request.title.replace(" ", "_")}.bpmn"'
        }
        return StreamingResponse(
            file_stream,
            media_type="application/xml",
            headers=headers
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao gerar o BPMN: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
