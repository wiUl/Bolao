from typing import Optional
from pydantic import BaseModel
from datetime import datetime

from app.core.liga_roles import LigaRole


class LigaMembroResponse(BaseModel):
    id: int
    liga_id: int
    usuario_id: int
    papel: LigaRole
    data_ingresso: datetime

    class Config:
        from_attributes = True


class LigaMembroUpdate(BaseModel):
    papel: LigaRole


class LigaMembroComUsuarioResponse(BaseModel):
    id: int
    liga_id: int
    usuario_id: int
    nome: str
    papel: LigaRole
    data_ingresso: datetime

    class Config:
        from_attributes = True

class SairLiga(BaseModel):
    novo_dono_usuario_id: Optional[int] = None