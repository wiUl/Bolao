from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.cobranca_mes import LigaCobrancaMes
from app.schemas.cobranca_mes import LigaCobrancaMesUpsert


def listar_cobranca_meses(
    db: Session,
    liga_id: int,
    somente_ativos: bool = False,
) -> List[LigaCobrancaMes]:
    q = (
        db.query(LigaCobrancaMes)
        .filter(LigaCobrancaMes.liga_id == liga_id)
        .order_by(LigaCobrancaMes.mes.asc())
    )
    if somente_ativos:
        q = q.filter(LigaCobrancaMes.ativo == True)  # noqa: E712
    return q.all()


def buscar_cobranca_mes(db: Session, liga_id: int, mes: int) -> Optional[LigaCobrancaMes]:
    return (
        db.query(LigaCobrancaMes)
        .filter(LigaCobrancaMes.liga_id == liga_id, LigaCobrancaMes.mes == mes)
        .first()
    )


def upsert_cobranca_mes(db: Session, liga_id: int, payload: LigaCobrancaMesUpsert) -> LigaCobrancaMes:
    if payload.mes < 1 or payload.mes > 12:
        raise ValueError("Mês inválido. Use 1..12.")

    obj = buscar_cobranca_mes(db, liga_id=liga_id, mes=payload.mes)
    now = datetime.now(timezone.utc)

    if obj is None:
        obj = LigaCobrancaMes(
            liga_id=liga_id,
            mes=payload.mes,
            ativo=payload.ativo,
            updated_at=now,
        )
        db.add(obj)
    else:
        obj.ativo = payload.ativo
        obj.updated_at = now

    db.commit()
    db.refresh(obj)
    return obj
