from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List

from app.schemas.liga import LigaResponse, TransferirPosse
from app.database import get_db
from app.core.liga_roles import LigaRole
from app.core.permissions import require_liga_roles
from app.core.dependencies import get_current_user, get_db
from app.models.usuario import Usuario
from app.services.liga_service import transferir_posse_liga


router = APIRouter(prefix="/serviços", tags=["Liga"])

@router.post("/{liga_id}/transferir-posse", response_model = LigaResponse)

def transferir_posse(
    liga_id: int,
    body: TransferirPosse,
    db: Session = Depends(get_db),
    papel_executor: LigaRole = Depends(require_liga_roles([LigaRole.dono])),
    usuario_logado: Usuario = Depends(get_current_user)
):
    transferir_posse_liga(db=db, liga_id=liga_id, dono_atual_id=usuario_logado.id, novo_dono_id=body.id_dono)

    return {"detail": "Posse da liga transferida com sucesso;."}



