from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LigaCreate(BaseModel):
    nome: str = Field(min_length=3, max_length=60)
    temporada_id: int = Field(gt=0)

class LigaEntrar(BaseModel):
    codigo_convite: str

class LigaResponse(BaseModel):
    id: int
    nome: str
    temporada_id: int
    codigo_convite: str
    id_dono: int
    data_criacao: datetime

    class Config:
        from_attributes = True

class LigaUpdate(BaseModel):
    nome: Optional[str] = Field(default=None, min_length=3, max_length=60)


class TransferirPosse(BaseModel):
    novo_dono_usuario_id: int

