from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JogoResponse(BaseModel):
    id: int
    temporada: int
    rodada: int
    time_casa: str
    time_fora: str
    gols_casa: Optional[str] = None
    gols_fora: Optional[str] = None
    data_hora: Optional[str] = None
    status: str

    class Config:
        from_attributes = True