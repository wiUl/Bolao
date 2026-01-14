from pydantic import BaseModel, Field
from typing import List, Optional
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

class RankingLigaResponse(BaseModel):
    nome: str
    pontos: int
    acertos_placar: int
    acertos_saldo: int
    acertos_resultado: int
    erros: int
    aproveitamento: float
    perc_placar: float
    perc_saldo: float
    perc_resultado: float 

class RankingLigaRodadaResponse(BaseModel):
    nome: str
    pontos: int
    acertos_placar: int
    acertos_saldo: int
    acertos_resultado: int


class PontuacaoAcumuladaResponse(BaseModel):
    nome: str
    rodada: int
    pontuacao_acumulada: int

class PontuacaoAcumuladaSerie(BaseModel):
    nome: str
    data: List[int]

class PontuacaoAcumuladaSeriesResponse(BaseModel):
    max_rodada: int
    series: List[PontuacaoAcumuladaSerie]