from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db

# ajuste pro seu caminho real:
from app.core.dependencies import get_current_user

from app.schemas.cobranca_mes import LigaCobrancaMesResponse, LigaCobrancaMesUpsert
from app.schemas.pagamentos import LigaPagamentoResponse, LigaPagamentoUpsert

from app.crud.cobranca_mes import listar_cobranca_meses, upsert_cobranca_mes
from app.crud.pagamentos import listar_pagamentos, upsert_pagamento
from app.models.liga_membro import LigaMembro



router = APIRouter(tags=["Pagamentos da Liga"])


def exigir_admin_liga(db: Session, liga_id: int, current_user_id: int) -> None:
    """
    Garante que o usuário autenticado seja admin_liga na liga.
    Suporta papel como Enum (ex: LigaRole.admin_liga) ou string.
    """
    membro = (
        db.query(LigaMembro)
        .filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == current_user_id)
        .first()
    )

    role_raw = membro.papel if membro else None

    # Normaliza role para string "admin_liga"
    role: str | None = None
    if role_raw is not None:
        # Enum -> pega .value (ex: "admin_liga"); string -> usa str(...)
        role = role_raw.value if hasattr(role_raw, "value") else str(role_raw)
        role = role.strip().lower()

    if role not in {"dono", "admin_liga"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito: apenas admin_liga pode acessar este recurso.",
        )


@router.get("/cobranca_meses/{liga_id}", response_model=List[LigaCobrancaMesResponse])
def api_listar_cobranca_meses(
    liga_id: int,
    somente_ativos: bool = Query(False),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    exigir_admin_liga(db, liga_id=liga_id, current_user_id=current_user.id)
    return listar_cobranca_meses(db, liga_id=liga_id, somente_ativos=somente_ativos)


@router.put("/cobranca_meses/{liga_id}", response_model=LigaCobrancaMesResponse)
def api_upsert_cobranca_mes(
    liga_id: int,
    body: LigaCobrancaMesUpsert,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    exigir_admin_liga(db, liga_id=liga_id, current_user_id=current_user.id)
    try:
        return upsert_cobranca_mes(db, liga_id=liga_id, payload=body)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/pagamentos_liga/{liga_id}", response_model=List[LigaPagamentoResponse])
def api_listar_pagamentos(
    liga_id: int,
    usuario_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    exigir_admin_liga(db, liga_id=liga_id, current_user_id=current_user.id)
    return listar_pagamentos(db, liga_id=liga_id, usuario_id=usuario_id)


@router.put("/pagamentos_liga/{liga_id}/usuarios/{usuario_id}", response_model=LigaPagamentoResponse)
def api_upsert_pagamento(
    liga_id: int,
    usuario_id: int,
    body: LigaPagamentoUpsert,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    exigir_admin_liga(db, liga_id=liga_id, current_user_id=current_user.id)
    try:
        return upsert_pagamento(
            db,
            liga_id=liga_id,
            usuario_id=usuario_id,
            payload=body,
            updated_by=current_user.id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
