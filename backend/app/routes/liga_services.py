from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.schemas.liga import LigaResponse, TransferirPosse, RankingLigaResponse, RankingLigaRodadaResponse, PontuacaoAcumuladaResponse
from app.database import get_db
from app.core.liga_roles import LigaRole
from app.core.permissions import require_liga_roles
from app.core.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.services.liga_service import pontuacao_acumulada_todos, transferir_posse_liga, ranking_liga, ranking_liga_rodada, pontuacao_acumulada_por_usuario


router = APIRouter(prefix="/servicos", tags=["Serviços Liga"])

@router.post("/{liga_id}/transferir_posse", response_model = LigaResponse)

def transferir_posse(
    liga_id: int,
    body: TransferirPosse,
    db: Session = Depends(get_db),
    papel_executor: LigaRole = Depends(require_liga_roles([LigaRole.dono])),
    usuario_logado: Usuario = Depends(get_current_user)
):
    transferir_posse_liga(db=db, liga_id=liga_id, dono_atual_id=usuario_logado.id, novo_dono_id=body.id_dono)

    return {"detail": "Posse da liga transferida com sucesso;."}


@router.get("/{liga_id}/ranking", response_model=list[RankingLigaResponse])

def ranking_da_liga(liga_id: int, db: Session = Depends(get_db), usuario_logado = Depends(get_current_user)):
    return ranking_liga(db=db, liga_id=liga_id)

@router.get("/{liga_id}/{rodada}/ranking_por_rodada", response_model=list[RankingLigaRodadaResponse])

def ranking_da_liga_por_rodada(liga_id: int, rodada: int, db: Session = Depends(get_db), usuario_logado = Depends(get_current_user)):
    return ranking_liga_rodada(db=db, liga_id=liga_id, rodada=rodada)

@router.get("/{liga_id}/pontuacao_acumulada", response_model=list[PontuacaoAcumuladaResponse])

def pontucao_acumulada_usuario(liga_id: int, usuario_nome: str, rodada: int | None, db: Session = Depends(get_db), usuario_logado = Depends(get_current_user)):
    return pontuacao_acumulada_por_usuario(db=db, liga_id=liga_id, nome_usuario=usuario_nome, rodada=rodada)


@router.get("{liga_id}/pontuacao_acumulada/todos", response_model=list[PontuacaoAcumuladaResponse])

def pontuacao_acumulada_geral(liga_id: int, rodada: int, db: Session = Depends(get_db), ususario_logado = Depends(get_current_user)):
    return pontuacao_acumulada_todos(db=db, liga_id=liga_id, rodada=rodada)


