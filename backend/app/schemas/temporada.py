from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TemporadaCreate(BaseModel):
    competicao_id: int
    ano: int
    data_inicio: Optional[datetime] = None  
    data_fim: Optional[datetime] = None
    status: Optional[str] = None

class TemporadaUpdate(BaseModel):
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    status: Optional[str] = None

class TemporadaResponse(BaseModel):
    id: int
    competicao_id: int
    ano: int
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
    status: str

    class Config:
        from_attributes = True
