from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class JogoCreate(BaseModel):
    temporada_id: int
    rodada: int
    time_casa_id: int
    time_fora_id: int
    data_hora: datetime  # envie em UTC (timezone-aware)

class JogoUpdate(BaseModel):
    rodada: Optional[int] = None
    data_hora: Optional[datetime] = None
    status: Optional[str] = None  # "agendado", "em_andamento", "finalizado", "cancelado"

class JogoResultadoUpdate(BaseModel):
    gols_casa: int
    gols_fora: int
    status: Optional[str] = "finalizado"

class JogoResponse(BaseModel):
    id: int
    temporada_id: int
    rodada: int
    time_casa_id: int
    time_fora_id: int
    gols_casa: Optional[int] = None
    gols_fora: Optional[int] = None
    data_hora: datetime
    status: str

    class Config:
        from_attributes = True
