from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy.orm import Session, selectinload
from app.models.jogo import Jogo
from app.schemas.jogo import JogoCreate, JogoUpdate, JogoResultadoUpdate
from app.models.palpite import Palpite
from app.services.palpites import calcular_pontuacao 


TZ_SP = ZoneInfo("America/Sao_Paulo")
TZ_UTC = ZoneInfo("UTC")

def parse_data_hora(data_hora_str: str) -> datetime:
    # ex: "2026-01-15T19:00"
    naive = datetime.fromisoformat(data_hora_str)
    local = naive.replace(tzinfo=TZ_SP)
    return local.astimezone(TZ_UTC)



def criar_jogo(db: Session, body: JogoCreate) -> Jogo:
    data = body.model_dump()

    if data.get("data_hora"):
        data["data_hora"] = parse_data_hora(data["data_hora"])

    jogo = Jogo(**data)
    db.add(jogo)
    db.commit()
    db.refresh(jogo)
    return jogo


def listar_jogos(db: Session, temporada_id: int | None = None, rodada: int | None = None):
    q = db.query(Jogo)
    if temporada_id is not None:
        q = q.filter(Jogo.temporada_id == temporada_id)
    if rodada is not None:
        q = q.filter(Jogo.rodada == rodada)
    return q.order_by(Jogo.data_hora.asc()).all()

def buscar_jogo(db: Session, jogo_id: int) -> Jogo | None:
    return (
        db.query(Jogo)
        .options(
            selectinload(Jogo.time_casa),
            selectinload(Jogo.time_fora),
        )
        .filter(Jogo.id == jogo_id)
        .first()
    )

def atualizar_jogo(db: Session, jogo: Jogo, body: JogoUpdate) -> Jogo:
    data = body.model_dump(exclude_unset=True)

    if "data_hora" in data and data["data_hora"]:
        data["data_hora"] = parse_data_hora(data["data_hora"])

    for k, v in data.items():
        setattr(jogo, k, v)

    db.commit()
    db.refresh(jogo)
    return jogo


def atualizar_resultado(db: Session, jogo: Jogo, body: JogoResultadoUpdate) -> Jogo:
    

    jogo.gols_casa = body.gols_casa
    jogo.gols_fora = body.gols_fora
    jogo.status = "finalizado"

    palpites = db.query(Palpite).filter(Palpite.jogo_id == jogo.id).all()

    for p in palpites:
        p.pontos = calcular_pontuacao(p.placar_casa, p.placar_fora, jogo.gols_casa, jogo.gols_fora)

    db.commit()
    db.refresh(jogo)
    return jogo

def deletar_jogo(db: Session, jogo: Jogo) -> None:
    db.delete(jogo)
    db.commit()
