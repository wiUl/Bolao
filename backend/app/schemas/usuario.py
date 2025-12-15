from pydantic import BaseModel
from typing import Optional

class UsuarioCreate(BaseModel):
    nome: str
    email_login: str
    senha: str

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email_login: Optional[str] = None
    senha: Optional[str] = None


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email_login: str
    
    
    class Config:
        from_attributes = True