from pydantic import BaseModel, Field
from typing import Optional

from app.core.roles import UserRole

class UsuarioCreate(BaseModel):
    nome: str
    email_login: str
    senha: str

class UsuarioUpdate(BaseModel): #admin atualiza usuários
    nome: Optional[str] = None
    email_login: Optional[str] = None
    senha: Optional[str] = Field(default=None, min_length=6, max_length=72)


class UsuarioMeUpdate(BaseModel): #usuário atualiza próprio usuário
    nome: Optional[str] = None
    email_login: Optional[str] = None
    senha: Optional[str] = Field(default=None, min_length=6, max_length=72)


class UsuarioResponse(BaseModel):
    id: int
    nome: str
    email_login: str
    funcao: UserRole
    
    
    class Config:
        from_attributes = True