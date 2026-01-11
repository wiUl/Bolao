from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy.orm import Session

from app.models.pagamentos import LigaPagamento
from app.models.cobranca_mes import LigaCobrancaMes
from app.schemas.pagamentos import LigaPagamentoUpsert


def listar_pagamentos(
    db: Session,
    liga_id: int,
    usuario_id: Optional[int] = None,
) -> List[LigaPagamento]:
    q = (
        db.query(LigaPagamento)
        .filter(LigaPagamento.liga_id == liga_id)
        .order_by(LigaPagamento.usuario_id.asc(), LigaPagamento.mes.asc())
    )
    if usuario_id is not None:
        q = q.filter(LigaPagamento.usuario_id == usuario_id)
    return q.all()


def buscar_pagamento(
    db: Session,
    liga_id: int,
    usuario_id: int,
    mes: int,
) -> Optional[LigaPagamento]:
    return (
        db.query(LigaPagamento)
        .filter(
            LigaPagamento.liga_id == liga_id,
            LigaPagamento.usuario_id == usuario_id,
            LigaPagamento.mes == mes,
        )
        .first()
    )


def mes_cobravel_ativo(db: Session, liga_id: int, mes: int) -> bool:
    row = (
        db.query(LigaCobrancaMes)
        .filter(LigaCobrancaMes.liga_id == liga_id, LigaCobrancaMes.mes == mes)
        .first()
    )
    return bool(row and row.ativo)


def upsert_pagamento(
    db: Session,
    liga_id: int,
    usuario_id: int,
    payload: LigaPagamentoUpsert,
    updated_by: Optional[int] = None,
) -> LigaPagamento:
    if payload.mes < 1 or payload.mes > 12:
        raise ValueError("Mês inválido. Use 1..12.")

    if not mes_cobravel_ativo(db, liga_id=liga_id, mes=payload.mes):
        raise ValueError("Este mês não está ativo para cobrança nessa liga.")

    obj = buscar_pagamento(db, liga_id=liga_id, usuario_id=usuario_id, mes=payload.mes)
    now = datetime.now(timezone.utc)

    if obj is None:
        obj = LigaPagamento(
            liga_id=liga_id,
            usuario_id=usuario_id,
            mes=payload.mes,
            pago=payload.pago,
            updated_at=now,
            updated_by=updated_by,
        )
        db.add(obj)
    else:
        obj.pago = payload.pago
        obj.updated_at = now
        obj.updated_by = updated_by

    db.commit()
    db.refresh(obj)
    return obj
