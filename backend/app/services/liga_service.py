from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, case


from app.core.liga_roles import LigaRole
from app.models import Palpite, Jogo, LigaMembro, Liga, Usuario

def transferir_posse_liga(
        db: Session,
        liga_id: int,
        dono_atual_id: int,
        novo_dono_id: int
):
    if dono_atual_id == novo_dono_id:
        raise HTTPException(status_code=400, detail="O novo dono deve ser diferente do dono atual.")
    
    liga = db.query(Liga).filter(Liga.id == liga_id).first()

    if not liga:
        raise HTTPException(status_code=404, detail="Liga não foi encontrada.")
    
    if liga.id_dono != dono_atual_id:
        raise HTTPException(status_code=403, detail="Apenas o dono atual pode transferir posse.")
    
    membro_dono_atual = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == dono_atual_id).first()

    if not membro_dono_atual or membro_dono_atual.papel != LigaRole.dono:
        raise HTTPException(status_code=409, detail="Estado Inconsistente: dono não está marcado como dono da liga.")
    
    membro_novo_dono = db.query(LigaMembro).filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == novo_dono_id).first()

    if not membro_novo_dono:
        raise HTTPException(status_code=404, detail="O novo dono precisa ser membro da liga.")
    
    try:
        membro_dono_atual.papel = LigaRole.membro
        membro_novo_dono.papel = LigaRole.dono
        liga.id_dono = novo_dono_id

        db.commit()
    except Exception:
        db.rollback()
        raise 


def ranking_liga(db: Session, liga_id: int):
    temporada_id = (
        db.query(Liga.temporada_id)
        .filter(Liga.id == liga_id)
        .scalar()
    )

    jogo_encerrado = (Jogo.status == "finalizado")

    total_jogos_encerrados_sq = (
        db.query(func.count(Jogo.id))
        .filter(Jogo.temporada_id == temporada_id)
        .filter(jogo_encerrado)
        .scalar_subquery()
    )

    pontos_expr = func.coalesce(func.sum(Palpite.pontos), 0)
    placar_expr = func.coalesce(func.sum(case((Palpite.pontos == 5, 1), else_=0)), 0)
    saldo_expr = func.coalesce(func.sum(case((Palpite.pontos == 4, 1), else_=0)), 0)
    resultado_expr = func.coalesce(func.sum(case((Palpite.pontos == 3, 1), else_=0)), 0)
    erros_expr = func.coalesce(func.sum(case((Palpite.pontos == 0, 1), else_=0)), 0)
    palpites_expr = func.coalesce(func.count(Palpite.id), 0)

    q = (
        db.query(
            Usuario.nome.label("nome"),
            pontos_expr.label("pontos"),
            placar_expr.label("acertos_placar"),
            saldo_expr.label("acertos_saldo"),
            resultado_expr.label("acertos_resultado"),
            erros_expr.label("erros"),
            total_jogos_encerrados_sq.label("jogos_encerrados"),
            palpites_expr.label("palpites_feitos"),
        )
        .join(LigaMembro, LigaMembro.usuario_id == Usuario.id)
        .filter(LigaMembro.liga_id == liga_id)
        .outerjoin(
            Palpite,
            and_(
                Palpite.liga_id == LigaMembro.liga_id,
                Palpite.usuario_id == LigaMembro.usuario_id,
            ),
        )
        .outerjoin(
            Jogo,
            and_(
                Jogo.id == Palpite.jogo_id,
                Jogo.temporada_id == temporada_id,
                jogo_encerrado,
            ),
        )
        .group_by(Usuario.id)
        .order_by(
            pontos_expr.desc(),
            placar_expr.desc(),
            saldo_expr.desc(),
            resultado_expr.desc(),
            Usuario.nome.asc(),
        )
    )

    rows = q.all()

    out = []
    for r in rows:
        jogos = int(r.jogos_encerrados or 0)
        pontos = int(r.pontos or 0)

        placar = int(r.acertos_placar or 0)
        saldo = int(r.acertos_saldo or 0)
        resultado = int(r.acertos_resultado or 0)
        erros = int(r.erros or 0)

        if jogos > 0:
            aproveitamento = pontos / (jogos * 5)
            percentagem_placar = placar / jogos
            percentagem_saldo = saldo / jogos
            percentagem_resultado = resultado / jogos
        else:
            aproveitamento = 0.0
            percentagem_placar = 0.0
            percentagem_saldo = 0.0
            percentagem_resultado = 0.0

        out.append({
            "nome": r.nome,
            "pontos": pontos,
            "acertos_placar": placar,
            "acertos_saldo": saldo,
            "acertos_resultado": resultado,
            "erros": erros,
            "aproveitamento": aproveitamento,
            "perc_placar": percentagem_placar,
            "perc_saldo": percentagem_saldo,
            "perc_resultado": percentagem_resultado,
        })

    return out


def ranking_liga_rodada(db: Session, liga_id: int, rodada: int):
    temporada_id = (
        db.query(Liga.temporada_id)
        .filter(Liga.id == liga_id)
        .scalar()
    )
    
    pv = (
        db.query(
            Palpite.usuario_id.label("usuario_id"),
            Palpite.liga_id.label("liga_id"),
            Palpite.pontos.label("pontos"),
        )
        .join(
            Jogo,
            and_(
                Jogo.id == Palpite.jogo_id,
                Jogo.temporada_id == temporada_id,
                Jogo.rodada == rodada,
                Jogo.status == "finalizado",
            ),
        )
        .filter(Palpite.liga_id == liga_id)
        .subquery("pv")
    )

    pontos_expr = func.coalesce(func.sum(pv.c.pontos), 0)
    placar_expr = func.coalesce(func.sum(case((pv.c.pontos == 5, 1), else_=0)), 0)
    saldo_expr = func.coalesce(func.sum(case((pv.c.pontos == 4, 1), else_=0)), 0)
    resultado_expr = func.coalesce(func.sum(case((pv.c.pontos == 3, 1), else_=0)), 0)

    q = (
        db.query(
            Usuario.nome.label("nome"),
            pontos_expr.label("pontos"),
            placar_expr.label("acertos_placar"),
            saldo_expr.label("acertos_saldo"),
            resultado_expr.label("acertos_resultado"),
        )
        .join(LigaMembro, LigaMembro.usuario_id == Usuario.id)
        .filter(LigaMembro.liga_id == liga_id)
        .outerjoin(
            pv,
            and_(
                pv.c.liga_id == LigaMembro.liga_id,
                pv.c.usuario_id == LigaMembro.usuario_id,
            ),
        )
        .group_by(Usuario.id)
        .order_by(
            pontos_expr.desc(),
            placar_expr.desc(),
            saldo_expr.desc(),
            resultado_expr.desc(),
            Usuario.nome.asc(),
        )
    )

    return q


def pontuacao_acumulada_por_usuario(db: Session, liga_id: int, nome_usuario: str, rodada: int | None = None):
    temporada_id = (
        db.query(Liga.temporada_id)
        .filter(Liga.id == liga_id)
        .scalar()
    )


    usuario = (
        db.query(Usuario)
        .filter(Usuario.nome.ilike(f"%{nome_usuario}%"))
        .first()
    )
    if not usuario:
        return []
    
    if rodada is None:
        rodada = (
            db.query(func.max(Jogo.rodada))
            .filter(
                Jogo.temporada_id == temporada_id,
                Jogo.status == "finalizado",
            )
            .scalar()
        )

    if not rodada:
        return []
    
    rows = (
        db.query(
            Jogo.rodada.label("rodada"),
            func.coalesce(func.sum(Palpite.pontos), 0).label("pontos_rodada"),
        )
        .join(Jogo, Jogo.id == Palpite.jogo_id)
        .filter(
            Palpite.liga_id == liga_id,
            Palpite.usuario_id == usuario.id,
            Jogo.status == "finalizado",
            Jogo.rodada <= rodada,
        )
        .group_by(Jogo.rodada)
        .all()
    )

    pontos_por_rodada = {int(r.rodada): int(r.pontos_rodada) for r in rows}

    acumulado = 0
    out = []
    for rodada in range(1, int(rodada) + 1):
        acumulado += pontos_por_rodada.get(rodada, 0)
        out.append({
            "nome": usuario.nome,
            "rodada": rodada,
            "pontuacao_acumulada": acumulado,
        })

    return out


def pontuacao_acumulada_todos(db, liga_id: int, rodada: int | None = None):
    temporada_id = db.query(Liga.temporada_id).filter(Liga.id == liga_id).scalar()

    if rodada is None:
        rodada = (
            db.query(func.max(Jogo.rodada))
            .filter(Jogo.temporada_id == temporada_id, Jogo.status == "finalizado")
            .scalar()
        )
    if not rodada:
        return []

    # pontos por (usuario, rodada)
    rows = (
        db.query(
            Usuario.id.label("usuario_id"),
            Usuario.nome.label("nome"),
            Jogo.rodada.label("rodada"),
            func.coalesce(func.sum(Palpite.pontos), 0).label("pontos_rodada"),
        )
        .join(LigaMembro, LigaMembro.usuario_id == Usuario.id)
        .filter(LigaMembro.liga_id == liga_id)
        .outerjoin(
            Palpite,
            and_(
                Palpite.liga_id == LigaMembro.liga_id,
                Palpite.usuario_id == LigaMembro.usuario_id,
            ),
        )
        .outerjoin(
            Jogo,
            and_(
                Jogo.id == Palpite.jogo_id,
                Jogo.temporada_id == temporada_id,
                Jogo.status == "finalizado",
                Jogo.rodada <= rodada,
            ),
        )
        .group_by(Usuario.id, Jogo.rodada)
        .all()
    )

    # monta mapa (usuario -> {rodada: pontos_rodada})
    usuarios = {}
    for r in rows:
        if r.rodada is None:
            continue
        usuarios.setdefault(r.usuario_id, {"nome": r.nome, "pontos": {}})
        usuarios[r.usuario_id]["pontos"][int(r.rodada)] = int(r.pontos_rodada or 0)

    # completa rodadas e acumula
    out = []
    for uid, info in usuarios.items():
        acumulado = 0
        for rodada in range(1, int(rodada) + 1):
            acumulado += info["pontos"].get(rodada, 0)
            out.append({
                "nome": info["nome"],
                "rodada": rodada,
                "pontuacao_acumulada": acumulado,
            })
    return out
