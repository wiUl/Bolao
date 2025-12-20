from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PalpiteCreate(BaseModel):
    placar_casa: int = Field(ge=0,le=20)
    placar_fora: int = Field(ge=0,le=20)

class PalpiteResponse(BaseModel):
    jogo_id: int
    time_casa: str
    palpite_casa: Optional[int]
    palpite_fora: Optional[int]
    time_fora: str
    data_criacao: Optional[datetime]
    status_jogo: str



class PalpiteRodadaResponse(BaseModel):
    jogo_id: int
    time_casa: str
    placar_real_casa: Optional[int]
    placar_real_fora: Optional[int]
    time_fora: str
    data_hora: Optional[datetime]
    status: str
    palpite_casa: Optional[int]
    palpite_fora: Optional[int]
    pontos: Optional[int]

class PalpiteJogoLigaResponse(BaseModel):
    usuario_nome: str

    time_casa: str
    placar_real_casa: Optional[int]
    placar_real_fora: Optional[int]
    time_fora: str
    data_hora: Optional[datetime]
    status: str

    palpite_casa: Optional[int]
    palpite_fora: Optional[int]
    pontos: Optional[int]
