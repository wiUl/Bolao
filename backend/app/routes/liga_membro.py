from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.core.dependencies import get_current_user
from app.core.permissions import require_admin, require_liga_roles
from app.models.liga_membro import LigaMembro
from app.schemas.liga_membro import LigaMembroComUsuarioResponse, LigaMembroResponse, LigaMembroUpdate
from app.core.liga_roles import LigaRole
from app.crud.liga_membro import atualizar_papel_membro, remover_membro_liga
from app.models.usuario import Usuario

router = APIRouter(prefix="/membro_ligas", tags=["Membro de Liga"])


@router.put("/{liga_id}/membros/{usuario_id}/papel", response_model = LigaMembroResponse)
def alterar_papel_membro(
    liga_id: int,
    usuario_id: int,
    body: LigaMembroUpdate,
    db: Session = Depends(get_db),
    papel_executor: LigaRole = Depends(require_liga_roles([LigaRole.dono, LigaRole.admin_liga])),
    usuario_logado: Usuario = Depends(get_current_user)
):
    
    if body.papel == LigaRole.dono:
        raise HTTPException(status_code=400, detail="Não é permitido promover usuário para dono.")
    
    if usuario_id == usuario_logado.id:
        raise HTTPException(status_code=400, detail="Você não pode alterar o próprio papel, se for dono transifira a posse da liga.")
    
    membro = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == usuario_id).first()
    if not membro:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")
    
    papel = membro.papel
    
    if papel_executor == LigaRole.admin_liga:
        if papel in (LigaRole.dono, LigaRole.admin_liga):
            raise HTTPException(status_code=403, detail="Admin da liga não pode alterar função de outro admin ou dono.")
        
    if papel == LigaRole.dono:
        raise HTTPException(status_code=400, detail="Para alterar o dono transfira a posse da liga.")
    
    membro = atualizar_papel_membro(db, liga_id, usuario_id, body.papel)
    if not membro:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")

    return membro


@router.get("/{liga_id}/membros", response_model=List[LigaMembroComUsuarioResponse])

def listar_membros(
    liga_id: int,
    db: Session = Depends(get_db),
    papel: str = Depends(require_liga_roles(roles=[LigaRole.dono, LigaRole.admin_liga, LigaRole.membro])),
):
    return listar_membros(db, liga_id)


@router.delete("/{liga_id}/membros/{usuario_id}", status_code=204)

def remover_membro(
    liga_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    papel_executor: LigaRole = Depends(require_liga_roles([LigaRole.dono, LigaRole.admin_liga])),
    usuario_logado: Usuario = Depends(get_current_user)
):
    if usuario_id == usuario_logado:
        raise HTTPException(status_code=400, detail="Use sair da Liga.")
    
    membro = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == usuario_id).first()

    if not membro:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")
    
    papel = membro.papel

    if papel == LigaRole.dono:
        raise HTTPException(status_code=400, detail="Não é permitido remover o dono da Liga.")
    
    if papel_executor == LigaRole.admin_liga and papel != LigaRole.membro:
        raise HTTPException(status_code=403, detail="Admin da liga só pode remover membros.")
    
    if (papel_executor == LigaRole.dono or papel_executor == LigaRole.admin_liga) and papel != LigaRole.membro:
        raise HTTPException(status_code=403, detail="Para remover um admin_liga, rebaixe para membro primeiro.")
    
    ok = remover_membro_liga(db, liga_id, usuario_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Membro não encontrado.")
    

@router.delete("/{liga_id}/membros/me", status_code=204)

def sair_liga(liga_id: int, db: Session = Depends(get_db), usuario_logado: Usuario = Depends(get_current_user)):

    membro = db.query(LigaMembro).filter(
        LigaMembro.liga_id == liga_id,
        LigaMembro.usuario_id == usuario_logado.id
    ).first()

    if not membro:
        raise HTTPException(status_code=404, detail="Você não é membro desta liga.")
    
    if membro.papel == LigaRole.dono:
        raise HTTPException(status_code=400, detail="Dono não pode sair da liga, sem transferir posse.")
    
    ok = remover_membro_liga(db, liga_id, usuario_logado.id)
    if not ok:
        raise HTTPException(status_code=404, detail="Você não é membro desta liga.")