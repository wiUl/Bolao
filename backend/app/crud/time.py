from sqlalchemy.orm import Session
from app.models.time import Time
from app.schemas.time import TimeCreate, TimeUpdate


def criar_time(db: Session, body: TimeCreate) -> Time:
    time = Time(
        nome=body.nome.strip(),
        sigla=body.sigla.strip() if body.sigla else None,
        escudo_url=body.escudo_url
    )

    db.add(time)
    db.commit()
    db.refresh(time)

    return time


def listar_times(db: Session) -> list[Time]:
    return db.query(Time).order_by(Time.nome.asc()).all()


def buscar_time(db: Session, time_id: int) -> Time | None:
    return db.query(Time).filter(Time.id == time_id).first()


def buscar_time_por_nome(db: Session, nome: str) -> Time | None:
    return db.query(Time).filter(Time.nome == nome).first()


def atualizar_time(db: Session, time: Time, body: TimeUpdate) -> Time:
    if body.nome is not None:
        time.nome = body.nome.strip()

    if body.sigla is not None:
        sigla_limpa = body.sigla.strip()
        time.sigla = sigla_limpa if sigla_limpa else None

    if body.escudo_url is not None:
        time.escudo_url = body.escudo_url

    db.commit()
    db.refresh(time)

    return time


def deletar_time(db: Session, time: Time) -> None:
    db.delete(time)
    db.commit()
