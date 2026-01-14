from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.permissions import require_admin
from app.schemas.time import TimeCreate, TimeUpdate, TimeResponse
from app.crud.time import criar_time, listar_times, buscar_time, atualizar_time, deletar_time
from app.core.dependencies import get_current_user


router = APIRouter(prefix="/times", tags=["Times"])


@router.post("", response_model=TimeResponse, status_code=status.HTTP_201_CREATED)
def criar(body: TimeCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    try:
        return criar_time(db, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=list[TimeResponse])
def listar(db: Session = Depends(get_db), usuario_logado=Depends(get_current_user)):
    return listar_times(db)


@router.get("/{time_id}", response_model=TimeResponse)
def busca_time(time_id: int, db: Session = Depends(get_db), usuario_logado=Depends(get_current_user)):
    time = buscar_time(db, time_id)
    if not time:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    return time


@router.put("/{time_id}", response_model=TimeResponse)
def atualiza_time(time_id: int, body: TimeUpdate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    time = buscar_time(db, time_id)
    if not time:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    return atualizar_time(db, time, body)


@router.delete("/{time_id}", status_code=status.HTTP_204_NO_CONTENT)
def exclui_time(time_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    time = buscar_time(db, time_id)
    if not time:
        raise HTTPException(status_code=404, detail="Time não encontrado.")
    deletar_time(db, time)
    return
