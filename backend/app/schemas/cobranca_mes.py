from pydantic import BaseModel, Field
from datetime import datetime


class LigaCobrancaMesResponse(BaseModel):
    id: int
    liga_id: int
    mes: int = Field(..., ge=1, le=12)
    ativo: bool
    updated_at: datetime

    class Config:
        from_attributes = True


class LigaCobrancaMesUpsert(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    ativo: bool
