from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_admin
from app.schemas.temporada import TemporadaCreate, TemporadaUpdate, TemporadaResponse
from app.crud.temporada import criar_temporada, listar_temporadas, buscar_temporada, atualizar_temporada, deletar_temporada
from app.crud.competicao import buscar_competicao

router = APIRouter(prefix="/temporadas", tags=["Temporadas"])

@router.post("", response_model=TemporadaResponse, status_code=status.HTTP_201_CREATED)
def cria_temporada(body: TemporadaCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    # valida FK de forma amigável
    if not buscar_competicao(db, body.competicao_id):
        raise HTTPException(status_code=404, detail="Competição não encontrada.")
    return criar_temporada(db, body)

@router.get("", response_model=list[TemporadaResponse])
def lista_temporadas(
    competicao_id: int | None = None,
    ano: int | None = None,
    db: Session = Depends(get_db)
):
    return listar_temporadas(db, competicao_id=competicao_id, ano=ano)

@router.get("/{temporada_id}", response_model=TemporadaResponse)
def busca_temporada(temporada_id: int, db: Session = Depends(get_db)):
    obj = buscar_temporada(db, temporada_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Temporada não encontrada.")
    return obj

@router.put("/{temporada_id}", response_model=TemporadaResponse)
def atualiza_temporada(temporada_id: int, body: TemporadaUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = buscar_temporada(db, temporada_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Temporada não encontrada.")
    return atualizar_temporada(db, obj, body)

@router.delete("/{temporada_id}", status_code=status.HTTP_204_NO_CONTENT)
def exclui_temporada(temporada_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = buscar_temporada(db, temporada_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Temporada não encontrada.")
    deletar_temporada(db, obj)
    return
