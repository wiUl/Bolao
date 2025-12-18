from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_admin
from app.schemas.jogo import JogoCreate, JogoUpdate, JogoResultadoUpdate, JogoResponse
from app.crud.jogo import criar_jogo, listar_jogos, buscar_jogo, atualizar_jogo, atualizar_resultado, deletar_jogo

from app.models.temporada import Temporada
from app.models.time import Time

router = APIRouter(prefix="/jogos", tags=["Jogos"])

@router.post("", response_model=JogoResponse, status_code=status.HTTP_201_CREATED)
def create_jogo(
    body: JogoCreate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    if body.time_casa_id == body.time_fora_id:
        raise HTTPException(400, detail="Time da casa e fora não podem ser iguais.")

    if not db.query(Temporada).filter(Temporada.id == body.temporada_id).first():
        raise HTTPException(404, detail="Temporada não encontrada.")

    if not db.query(Time).filter(Time.id == body.time_casa_id).first():
        raise HTTPException(404, detail="Time da casa não encontrado.")

    if not db.query(Time).filter(Time.id == body.time_fora_id).first():
        raise HTTPException(404, detail="Time de fora não encontrado.")

    return criar_jogo(db, body)

@router.get("", response_model=list[JogoResponse])
def get_jogos(
    temporada_id: int | None = None,
    rodada: int | None = None,
    db: Session = Depends(get_db),
):
    return listar_jogos(db, temporada_id=temporada_id, rodada=rodada)

@router.get("/{jogo_id}", response_model=JogoResponse)
def get_jogo(jogo_id: int, db: Session = Depends(get_db)):
    jogo = buscar_jogo(db, jogo_id)
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")
    return jogo

@router.put("/{jogo_id}", response_model=JogoResponse)
def update_jogo(
    jogo_id: int,
    body: JogoUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    jogo = buscar_jogo(db, jogo_id)
    if not jogo:
        raise HTTPException(404, detail="Jogo não encontrado.")
    return atualizar_jogo(db, jogo, body)

@router.patch("/{jogo_id}/resultado", response_model=JogoResponse)
def set_resultado(
    jogo_id: int,
    body: JogoResultadoUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    jogo = buscar_jogo(db, jogo_id)
    if not jogo:
        raise HTTPException(404, detail="Jogo não encontrado.")
    return atualizar_resultado(db, jogo, body)

@router.delete("/{jogo_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_jogo(
    jogo_id: int,
    db: Session = Depends(get_db),
    _=Depends(require_admin),
):
    jogo = buscar_jogo(db, jogo_id)
    if not jogo:
        raise HTTPException(404, detail="Jogo não encontrado.")
    deletar_jogo(db, jogo)
    return
