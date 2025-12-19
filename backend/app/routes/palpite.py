# app/routes/palpite.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.palpite import PalpiteCreate, PalpiteResponse
from app.services.palpites import upsert_palpite, remover_meu_palpite, validar_membro_liga
from app.models.palpite import Palpite

router = APIRouter(prefix="/palpites", tags=["Palpites"])

@router.put("/ligas/{liga_id}/jogos/{jogo_id}/meu", response_model=PalpiteResponse)
def criar_ou_atualizar_meu_palpite(
    liga_id: int,
    jogo_id: int,
    body: PalpiteCreate,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    return upsert_palpite(db, liga_id, usuario_logado.id, jogo_id, body.placar_casa, body.placar_fora)


@router.get("/ligas/{liga_id}/jogos/{jogo_id}/meu", response_model=PalpiteResponse)
def ver_meu_palpite(
    liga_id: int,
    jogo_id: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    palpite = (
        db.query(Palpite)
        .filter(Palpite.liga_id == liga_id, Palpite.usuario_id == usuario_logado.id, Palpite.jogo_id == jogo_id)
        .first()
    )
    if not palpite:
        raise HTTPException(status_code=404, detail="Palpite não encontrado.")
    return palpite

@router.delete("/ligas/{liga_id}/jogos/{jogo_id}/meu", status_code=status.HTTP_204_NO_CONTENT)
def deletar_meu_palpite(
    liga_id: int,
    jogo_id: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    remover_meu_palpite(db, liga_id, usuario_logado.id, jogo_id)
    return

@router.get("/ligas/{liga_id}/jogos/{jogo_id}", response_model=list[PalpiteResponse])
def listar_palpites_do_jogo_na_liga(
    liga_id: int,
    jogo_id: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    validar_membro_liga(db, liga_id, usuario_logado.id)

    return (
        db.query(Palpite)
        .filter(Palpite.liga_id == liga_id, Palpite.jogo_id == jogo_id)
        .all()
    )