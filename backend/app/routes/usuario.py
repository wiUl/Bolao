from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.schemas.usuario import UsuarioCreate, UsuarioResponse, UsuarioUpdate
from app.crud.usuario import criar_usuario, listar_usuarios, buscar_usuario_por_id, atualizar_usuario, deletar_usuario
from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario


router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

@router.post("/", response_model=UsuarioResponse)

def cadastrar(
        usuario: UsuarioCreate,
        db: Session = Depends(get_db)
):
    try:

        return criar_usuario(db, usuario)
    
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="Email ou username já cadastrado!"
        )
    
@router.get("/", response_model=List[UsuarioResponse])

def listar(db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    return listar_usuarios(db)

@router.get("/{usuario_id}", response_model=UsuarioResponse)

def buscar(usuario_id: int, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    usuario = buscar_usuario_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return usuario

@router.put("/{usuario_id}", response_model=UsuarioResponse)

def atualizar(usuario_id: int, dados: UsuarioUpdate, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    usuario = atualizar_usuario(db, usuario_id, dados)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    return usuario

@router.delete("/{usuario_id}")

def deletar(usuario_id: int, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    sucesso = deletar_usuario(db, usuario_id)
    if not sucesso:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")
    
    return {"message" : f"O usuário {usuario_id} foi deletado com sucesso."}

    
