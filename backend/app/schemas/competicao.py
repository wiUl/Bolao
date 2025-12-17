from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CompeticaoResponse(BaseModel):
    id: int
    nome: str
    pais: Optional[str] = None
    tipo: Optional[str] = None

    class Config:
        from_attributes = True

class CompeticaoCreate(BaseModel):
    nome: str
    pais: Optional[str] = None
    tipo: Optional[str] = None  

class CompeticaoUpdate(BaseModel):
    nome: Optional[str] = None
    pais: Optional[str] = None
    tipo: Optional[str] = None