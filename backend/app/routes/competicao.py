from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_admin
from app.schemas.competicao import CompeticaoCreate, CompeticaoUpdate, CompeticaoResponse
from app.crud.competicao import criar_competicao, listar_competicoes, buscar_competicao, atualizar_competicao, deletar_competicao

router = APIRouter(prefix="/competicoes", tags=["Competições"])

@router.post("", response_model=CompeticaoResponse, status_code=status.HTTP_201_CREATED)
def cria_competicao(body: CompeticaoCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return criar_competicao(db, body)

@router.get("", response_model=list[CompeticaoResponse])
def lista_competicoes(db: Session = Depends(get_db)):
    return listar_competicoes(db)

@router.get("/{competicao_id}", response_model=CompeticaoResponse)
def busca_competicao(competicao_id: int, db: Session = Depends(get_db)):
    obj = buscar_competicao(db, competicao_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Competição não encontrada.")
    return obj

@router.put("/{competicao_id}", response_model=CompeticaoResponse)
def atualiza_competicao(competicao_id: int, body: CompeticaoUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = buscar_competicao(db, competicao_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Competição não encontrada.")
    return atualizar_competicao(db, obj, body)

@router.delete("/{competicao_id}", status_code=status.HTTP_204_NO_CONTENT)
def exclui_competicao(competicao_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    obj = buscar_competicao(db, competicao_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Competição não encontrada.")
    deletar_competicao(db, obj)
    return
