from datetime import datetime
from zoneinfo import ZoneInfo
from sqlalchemy import case, func
from sqlalchemy.orm import Session, selectinload
from app.models.jogo import Jogo
from app.schemas.jogo import JogoCreate, JogoUpdate, JogoResultadoUpdate
from app.models.palpite import Palpite
from app.services.palpites import calcular_pontuacao 


TZ_SP = ZoneInfo("America/Sao_Paulo")
TZ_UTC = ZoneInfo("UTC")

def parse_data_hora(data_hora) -> datetime | None:
    if data_hora is None:
        return None

    # 1️⃣ Se já vier como datetime (Postgres / ORM)
    if isinstance(data_hora, datetime):
        # se já tem tzinfo, só normaliza pra UTC
        if data_hora.tzinfo is not None:
            return data_hora.astimezone(TZ_UTC)

        # se for naive, assume America/Sao_Paulo
        local = data_hora.replace(tzinfo=TZ_SP)
        return local.astimezone(TZ_UTC)

    # 2️⃣ Se vier como string (payload JSON)
    if isinstance(data_hora, str):
        naive = datetime.fromisoformat(data_hora)
        local = naive.replace(tzinfo=TZ_SP)
        return local.astimezone(TZ_UTC)

    # 3️⃣ Qualquer outro tipo é erro
    raise TypeError(f"Tipo inválido para data_hora: {type(data_hora)}")



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
    q = (
        db.query(Jogo)
        .options(
            selectinload(Jogo.time_casa),
            selectinload(Jogo.time_fora),
        )
    )
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


def buscar_rodada_atual(db: Session, temporada_id: int) -> int:
    """
    Retorna o número da rodada cujo jogo tem data_hora mais próxima de agora
    (considera passado e futuro — menor distância absoluta vence).
    Retorna 1 como fallback se não houver jogos com data_hora definida.
    """
    jogo = (
        db.query(Jogo)
        .filter(
            Jogo.temporada_id == temporada_id,
            Jogo.data_hora.isnot(None),
        )
        .order_by(
            func.abs(
                func.extract("epoch", Jogo.data_hora)
                - func.extract("epoch", func.now())
            )
        )
        .first()
    )
 
    return jogo.rodada if jogo is not None else 1


def buscar_info_rodadas(db: Session, temporada_id: int) -> dict:
    """
    Retorna em uma única passagem pelo banco:
    - ultima_existente : maior número de rodada que tem ao menos 1 jogo cadastrado
    - ultima_finalizada: maior rodada onde TODOS os jogos têm status 'finalizado'
                         (ignora rodadas com jogos adiados/pendentes no meio do campeonato)
    - rodada_atual     : rodada com jogo de data_hora mais próxima de agora
 
    Queries independentes para que um jogo adiado em uma rodada intermediária
    não bloqueie o reconhecimento das rodadas posteriores já finalizadas.
    """
 
    # 1. Maior rodada com ao menos 1 jogo cadastrado
    ultima_existente: int = (
        db.query(func.max(Jogo.rodada))
        .filter(Jogo.temporada_id == temporada_id)
        .scalar()
    ) or 0
 
    # 2. Maior rodada em que TODOS os jogos estão finalizados.
    #    Subquery: rodadas onde total de jogos == total de jogos finalizados.
    rodadas_completas_sq = (
        db.query(Jogo.rodada)
        .filter(Jogo.temporada_id == temporada_id)
        .group_by(Jogo.rodada)
        .having(
            func.count(Jogo.id)
            == func.sum(case((Jogo.status == "finalizado", 1), else_=0))
        )
        .subquery()
    )
    ultima_finalizada: int = (
        db.query(func.max(rodadas_completas_sq.c.rodada)).scalar()
    ) or 0
 
    # 3. Rodada atual (jogo com data_hora mais próxima de agora)
    rodada_atual: int = buscar_rodada_atual(db, temporada_id)
 
    # 4. Rodada padrão para o seletor: última totalmente finalizada,
    #    ou a atual se ainda nenhuma foi finalizada.
    default_rodada = ultima_finalizada if ultima_finalizada > 0 else max(rodada_atual, 1)
 
    return {
        "ultima_existente": ultima_existente,
        "ultima_finalizada": ultima_finalizada,
        "rodada_atual": rodada_atual,
        "default_rodada": default_rodada,
    }
