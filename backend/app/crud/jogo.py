from sqlalchemy.orm import Session
from app.models.jogo import Jogo
from app.schemas.jogo import JogoCreate, JogoUpdate, JogoResultadoUpdate

def criar_jogo(db: Session, body: JogoCreate) -> Jogo:
    jogo = Jogo(**body.model_dump())
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
    return db.query(Jogo).filter(Jogo.id == jogo_id).first()

def atualizar_jogo(db: Session, jogo: Jogo, body: JogoUpdate) -> Jogo:
    data = body.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(jogo, k, v)
    db.commit()
    db.refresh(jogo)
    return jogo

def atualizar_resultado(db: Session, jogo: Jogo, body: JogoResultadoUpdate) -> Jogo:
    jogo.gols_casa = body.gols_casa
    jogo.gols_fora = body.gols_fora
    if body.status:
        jogo.status = body.status
    db.commit()
    db.refresh(jogo)
    return jogo

def deletar_jogo(db: Session, jogo: Jogo) -> None:
    db.delete(jogo)
    db.commit()
