from pydantic import BaseModel
from datetime import datetime

from app.core.roles import UserRole


class LigaMembroResponse(BaseModel):
    id: int
    liga_id: int
    usuario_id: int
    papel: UserRole
    data_ingresso: datetime

    class Config:
        from_attributes = True
