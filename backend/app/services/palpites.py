# app/services/palpites.py  (pode ser app/crud/palpite.py se preferir)
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.models.liga_membro import LigaMembro
from app.models.liga import Liga
from app.models.jogo import Jogo
from app.models.palpite import Palpite

def utcnow():
    return datetime.now(timezone.utc)

def validar_membro_liga(db: Session, liga_id: int, usuario_id: int) -> None:
    membro = (
        db.query(LigaMembro)
        .filter(LigaMembro.liga_id == liga_id, LigaMembro.usuario_id == usuario_id)
        .first()
    )
    if not membro:
        raise HTTPException(status_code=403, detail="Você não é membro desta liga.")

def buscar_liga(db: Session, liga_id: int) -> Liga:
    liga = db.query(Liga).filter(Liga.id == liga_id).first()
    if not liga:
        raise HTTPException(status_code=404, detail="Liga não encontrada.")
    return liga

def buscar_jogo(db: Session, jogo_id: int) -> Jogo:
    jogo = db.query(Jogo).filter(Jogo.id == jogo_id).first()
    if not jogo:
        raise HTTPException(status_code=404, detail="Jogo não encontrado.")
    return jogo

def validar_temporada_liga_vs_jogo(liga: Liga, jogo: Jogo) -> None:
    # Se sua Liga ainda tem `temporada` int, adapte aqui:
    # if liga.temporada != jogo.temporada: ...
    if getattr(liga, "temporada_id", None) is not None:
        if liga.temporada_id != jogo.temporada_id:
            raise HTTPException(status_code=400, detail="Este jogo não pertence à temporada da liga.")

def validar_lock(jogo: Jogo) -> None:
    if jogo.data_hora is None:
        return
    
    dt = jogo.data_hora
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    if not jogo.data_hora:
        raise HTTPException(status_code=400, detail="Jogo sem data/hora definida; palpite indisponível.")
    if utcnow() >= dt:
        raise HTTPException(status_code=400, detail="Palpites estão bloqueados para este jogo (já começou).")

def upsert_palpite(db: Session, liga_id: int, usuario_id: int, jogo_id: int, placar_casa: int, placar_fora: int) -> Palpite:
    # validações
    validar_membro_liga(db, liga_id, usuario_id)
    liga = buscar_liga(db, liga_id)
    jogo = buscar_jogo(db, jogo_id)
    validar_temporada_liga_vs_jogo(liga, jogo)
    validar_lock(jogo)

    palpite = (
        db.query(Palpite)
        .filter(Palpite.liga_id == liga_id, Palpite.usuario_id == usuario_id, Palpite.jogo_id == jogo_id)
        .first()
    )

    if palpite:
        palpite.placar_casa = placar_casa
        palpite.placar_fora = placar_fora
    else:
        palpite = Palpite(
            liga_id=liga_id,
            usuario_id=usuario_id,
            jogo_id=jogo_id,
            placar_casa=placar_casa,
            placar_fora=placar_fora,
        )
        db.add(palpite)

    db.commit()
    db.refresh(palpite)
    return palpite

def remover_meu_palpite(db: Session, liga_id: int, usuario_id: int, jogo_id: int) -> None:
    validar_membro_liga(db, liga_id, usuario_id)
    jogo = buscar_jogo(db, jogo_id)
    validar_lock(jogo)

    palpite = (
        db.query(Palpite)
        .filter(Palpite.liga_id == liga_id, Palpite.usuario_id == usuario_id, Palpite.jogo_id == jogo_id)
        .first()
    )
    if not palpite:
        raise HTTPException(status_code=404, detail="Palpite não encontrado.")

    db.delete(palpite)
    db.commit()


def calcular_pontuacao(gols_casa_palpite: int, gols_fora_palpite: int, gols_casa_real: int, gols_fora_real: int) -> int:
    #acertou placar exato leva 5 pontos
    if gols_casa_palpite == gols_casa_real and gols_fora_palpite == gols_fora_real:
        return 5
    
    diferenca_palpite = gols_casa_palpite - gols_fora_palpite
    diferenca_real = gols_casa_real - gols_fora_real

    #empate houve, então ganha 3 se acertou o empate e 0 se errou
    if diferenca_real == 0:
        return 3 if diferenca_palpite == 0 else 0
    
    #não houve empate, mas acertou a diferença de gols do resultado real, então leva 4 pontos
    if diferenca_palpite == diferenca_real:
        return 4

    #não houve empate e acertou o lado vencedor então leva 3 pontos
    if (diferenca_palpite > 0 and diferenca_real > 0) or (diferenca_palpite < 0 and diferenca_real < 0):
        return 3

    return 0
