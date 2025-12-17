from pydantic import BaseModel
from typing import Optional

class TimeBase(BaseModel):
    nome: str
    sigla: Optional[str] = None
    escudo_url: Optional[str] = None

class TimeCreate(BaseModel):
    pass 

class TimeUpdate(BaseModel):
    nome: Optional[str] = None
    sigla: Optional[str] = None
    escudo_url: Optional[str] = None

class TimeResponse(BaseModel):
    id: int
    nome: str

    class Config:
        from_attributes = True