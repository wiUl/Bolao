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
    data_hora: Optional[datetime] = None
    status: Optional[str] = None  # "agendado", "em_andamento", "finalizado", "cancelado"

class JogoResultadoUpdate(BaseModel):
    gols_casa: int
    gols_fora: int
    

class TimeResumo(BaseModel):
    id: int
    nome: str
    sigla: str

    class Config:
        from_attributes = True

class JogoResponse(BaseModel):
    id: int
    temporada_id: int
    rodada: int
    time_casa: TimeResumo
    time_fora: TimeResumo
    gols_casa: Optional[int] = None
    gols_fora: Optional[int] = None
    data_hora: Optional[datetime]
    status: str

    class Config:
        from_attributes = True
