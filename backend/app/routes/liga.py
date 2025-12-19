from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_liga_papel
from app.models.usuario import Usuario
from app.schemas.liga import LigaCreate, LigaResponse, LigaEntrar, LigaUpdate
from app.crud.liga import criar_liga, entrar_liga, listar_ligas_do_usuario, buscar_liga_por_id, atualizar_liga, deletar_liga

router = APIRouter(prefix="/ligas", tags=["Ligas"])


@router.post("/", response_model=LigaResponse)

def criar(dados: LigaCreate, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    try:
        return criar_liga(db, usuario_logado.id, dados.nome, dados.temporada_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    

@router.post("/entrar", response_model=LigaResponse)

def entrar(dados: LigaEntrar, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    liga, status = entrar_liga(db, usuario_logado.id, dados.codigo_convite)
    if status == "convite_invalido":
        raise HTTPException(status_code=404, detail="Código de Convite inválido.")
    
    if status == "ja_membro":
        raise HTTPException(status_code=400, detail="Você já está cadastrado nesta liga.")
    
    return liga


@router.get("/minhas_ligas", response_model=List[LigaResponse])

def minhas_ligas(temporada_id: Optional[int] = None, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    return listar_ligas_do_usuario(db, usuario_logado.id, temporada_id)

@router.put("/{liga_id}", response_model=LigaResponse)

def atualizar(liga_id: int, dados: LigaUpdate, db: Session = Depends(get_db), usuario_logado = Depends(get_current_user)):
    liga = buscar_liga_por_id(db, liga_id)

    if not liga:
        raise HTTPException(status_code=404, detail="Liga não encontrada.")
    
    require_liga_papel(db, liga_id, usuario_logado.id, roles=["dono", "admin_liga"])

    return atualizar_liga(db, liga, dados)

@router.delete("/{liga_id}")
def deletar(liga_id: int, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):
    liga = buscar_liga_por_id(db, liga_id)
    if not liga:
        raise HTTPException(status_code=404, detail="Liga não encontrada")
    require_liga_papel(db, liga_id, usuario_logado.id, roles=["dono"])

    deletar_liga(db, liga)

    return {"message": f"Liga {liga.nome} {liga.temporada} deletada com sucesso."}