from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class LigaPagamentoResponse(BaseModel):
    id: int
    liga_id: int
    usuario_id: int
    mes: int = Field(..., ge=1, le=12)
    pago: bool
    updated_at: datetime
    updated_by: Optional[int] = None

    class Config:
        from_attributes = True


class LigaPagamentoUpsert(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    pago: bool
