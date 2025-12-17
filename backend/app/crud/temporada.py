from sqlalchemy.orm import Session
from app.models.temporada import Temporada
from app.schemas.temporada import TemporadaCreate, TemporadaUpdate

def criar_temporada(db: Session, body: TemporadaCreate) -> Temporada:
    obj = Temporada(
        competicao_id=body.competicao_id,
        ano=body.ano,
        data_inicio=body.data_inicio,
        data_fim=body.data_fim,
        status=body.status or "planejada",
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj

def listar_temporadas(db: Session, competicao_id: int | None = None, ano: int | None = None) -> list[Temporada]:
    q = db.query(Temporada)
    if competicao_id is not None:
        q = q.filter(Temporada.competicao_id == competicao_id)
    if ano is not None:
        q = q.filter(Temporada.ano == ano)
    return q.order_by(Temporada.ano.desc()).all()

def buscar_temporada(db: Session, temporada_id: int) -> Temporada | None:
    return db.query(Temporada).filter(Temporada.id == temporada_id).first()

def atualizar_temporada(db: Session, obj: Temporada, body: TemporadaUpdate) -> Temporada:
    if body.data_inicio is not None:
        obj.data_inicio = body.data_inicio
    if body.data_fim is not None:
        obj.data_fim = body.data_fim
    if body.status is not None:
        obj.status = body.status

    db.commit()
    db.refresh(obj)
    return obj

def deletar_temporada(db: Session, obj: Temporada) -> None:
    db.delete(obj)
    db.commit()
