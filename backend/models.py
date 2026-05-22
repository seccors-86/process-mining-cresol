import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True) # None for simple mock auth if needed
    role = Column(String(50), default="analyst")
    is_active = Column(Boolean, default=True)

    diagrams = relationship("DiagramModel", back_populates="owner")


class Area(Base):
    """
    Represents functional areas / departments inside the organization.
    Used for swimlanes reference.
    """
    __tablename__ = "areas"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)


class DiagramModel(Base):
    """
    Stores process diagram versions, layout data (React Flow), 
    and generated python POWL code.
    """
    __tablename__ = "diagrams"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    
    # Store the generated python script representing the POWL structure
    powl_code = Column(Text, nullable=True)
    
    # Store the generated BPMN XML
    xml_data = Column(Text, nullable=True)
    
    # Store React Flow node/edge structure and metadata
    json_data = Column(JSON, nullable=True) 
    
    # User-added notes and annotations per activity
    notes = Column(JSON, nullable=True) # e.g. {"Activity_Name": "Observation note content"}
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    owner = relationship("User", back_populates="diagrams")
