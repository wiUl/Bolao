from pydantic import BaseModel
from typing import Optional


class TimeBase(BaseModel):
    nome: str
    sigla: Optional[str] = None
    escudo_url: Optional[str] = None


class TimeCreate(TimeBase):
    pass


class TimeUpdate(BaseModel):
    nome: Optional[str] = None
    sigla: Optional[str] = None
    escudo_url: Optional[str] = None


class TimeResponse(BaseModel):
    id: int
    nome: str
    sigla: Optional[str] = None
    escudo_url: Optional[str] = None

    class Config:
        from_attributes = True
