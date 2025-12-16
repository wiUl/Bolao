from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PalpiteCreate(BaseModel):
    jogo_id: int
    placar_casa: int = Field(ge=0,le=20)
    placar_fora: int = Field(ge=0,le=20)

class PalpiteResponse(BaseModel):
    id: int
    liga_id: int
    usuario_id: int
    jogo_id: int
    placar_casa: int
    placar_fora: int
    pontos: Optional[int] = None
    data_criacao: datetime
    ultima_atualizacao: datetime

    class Config:
        from_attributes = True
