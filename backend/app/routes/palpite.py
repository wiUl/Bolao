# app/routes/palpite.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.models.usuario import Usuario
from app.schemas.palpite import PalpiteCreate, PalpiteJogoLigaResponse, PalpiteResponse, PalpiteRodadaResponse
from app.services.palpites import meu_palpite_no_jogo, palpite_response_do_jogo, palpites_do_jogo_na_liga, palpites_usuario_na_rodada, upsert_palpite, remover_meu_palpite, validar_membro_liga
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
    upsert_palpite(db, liga_id, usuario_logado.id, jogo_id, body.placar_casa, body.placar_fora)

    resp = palpite_response_do_jogo(db, liga_id, usuario_logado.id, jogo_id)
    if not resp:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")
    return resp


@router.get("/ligas/{liga_id}/jogos/{jogo_id}/meu", response_model=PalpiteRodadaResponse)

def ver_meu_palpite(
    liga_id: int,
    jogo_id: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    validar_membro_liga(db, liga_id, usuario_logado.id)
    data = meu_palpite_no_jogo(db, liga_id, usuario_logado.id, jogo_id)
    if not data:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")
    return data


@router.get("/ligas/{liga_id}/jogos/{jogo_id}", response_model=list[PalpiteJogoLigaResponse])

def listar_palpites_do_jogo_na_liga(
    liga_id: int,
    jogo_id: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    validar_membro_liga(db, liga_id, usuario_logado.id)
    return palpites_do_jogo_na_liga(db, liga_id, jogo_id)

@router.get("/{liga_id}/rodadas/{rodada}/usuarios/me/palpites", response_model=list[PalpiteRodadaResponse],)

def meus_palpites_na_rodada(
    liga_id: int,
    rodada: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    validar_membro_liga(db, liga_id, usuario_logado.id)
    return palpites_usuario_na_rodada(db, liga_id, usuario_logado.id, rodada)


@router.delete("/ligas/{liga_id}/jogos/{jogo_id}/meu", status_code=status.HTTP_204_NO_CONTENT)

def deletar_meu_palpite(
    liga_id: int,
    jogo_id: int,
    db: Session = Depends(get_db),
    usuario_logado: Usuario = Depends(get_current_user),
):
    remover_meu_palpite(db, liga_id, usuario_logado.id, jogo_id)
    return