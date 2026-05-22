import os
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from database import engine, get_db
from agents.graph import run_agent_workflow
from utils.document import generate_process_document

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

class AreaResponse(AreaCreate):
    id: int
    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    process_description: str
    messages: List[Dict[str, str]] = []
    conversation_history: List[Dict[str, str]] = []

class DocumentExportRequest(BaseModel):
    title: str
    description: str
    json_data: Dict[str, Any]
    notes: Optional[Dict[str, str]] = None
    powl_code: Optional[str] = ""


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


# 2. Functional Areas (Swimlane Reference)
@app.get("/api/areas", response_model=List[AreaResponse])
def list_areas(db: Session = Depends(get_db)):
    areas = db.query(models.Area).all()
    return areas

@app.post("/api/areas", response_model=AreaResponse, status_code=status.HTTP_201_CREATED)
def create_area(area: AreaCreate, db: Session = Depends(get_db)):
    # Check if area exists
    existing = db.query(models.Area).filter(models.Area.name == area.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Esta área funcional já está cadastrada.")
    
    db_area = models.Area(name=area.name, description=area.description)
    db.add(db_area)
    db.commit()
    db.refresh(db_area)
    return db_area


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
            conversation_history=request.conversation_history
        )
        
        # Format response
        return {
            "code": result.get("code"),
            "error": result.get("error"),
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
@app.post("/api/document")
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
            powl_code=request.powl_code or ""
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
