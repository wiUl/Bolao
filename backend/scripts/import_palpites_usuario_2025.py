import unicodedata
from pathlib import Path

import pandas as pd
from sqlalchemy.orm import Session

from app.database import Sessionlocal
from app.models.time import Time
from app.models.jogo import Jogo
from app.models.palpite import Palpite
from app.services.palpites import calcular_pontuacao


BASE_DADOS = Path(r"C:\Users\wiul\Documents\Projetos\Bolao\backend\scripts\dados")

# CSV normalizado gerado no script anterior
CSV_PALPITES = BASE_DADOS / "palpites_{nome_usuario}.csv"


# aliases (CSV -> Banco). Pode ter acento; vamos normalizar na busca.
ALIASES_TIMES = {
    "bragantino": "RB Bragantino",
    "rb bragantino": "RB Bragantino",
    "atletico mg": "Atlético Mineiro",
    "atlético mg": "Atlético Mineiro",
    "vasco": "Vasco da Gama"
}

def normalizar_nome(s: str) -> str:
    s = (s or "").strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    for ch in ["-", "_", ".", ",", "’", "'"]:
        s = s.replace(ch, " ")
    s = " ".join(s.split())
    return s

def montar_indice_times(db: Session) -> dict[str, Time]:
    idx = {}
    for t in db.query(Time).all():
        if getattr(t, "nome", None):
            idx[normalizar_nome(t.nome)] = t
        # se você tiver sigla preenchida, ajuda a casar mais fácil
        if getattr(t, "sigla", None):
            idx[normalizar_nome(t.sigla)] = t
    return idx

def achar_time(idx: dict[str, Time], nome_csv: str) -> Time:
    key = normalizar_nome(nome_csv)

    if key in idx:
        return idx[key]

    alias_raw = ALIASES_TIMES.get(key)
    if alias_raw:
        alias_key = normalizar_nome(alias_raw)
        if alias_key in idx:
            return idx[alias_key]

    raise ValueError(f"Time não encontrado. CSV='{nome_csv}' | key='{key}' | alias='{alias_raw}'")

def achar_jogo(db: Session, temporada_id: int, rodada: int, time_casa_id: int, time_fora_id: int) -> int:
    jogo = (
        db.query(Jogo)
        .filter(
            Jogo.temporada_id == temporada_id,
            Jogo.rodada == rodada,
            Jogo.time_casa_id == time_casa_id,
            Jogo.time_fora_id == time_fora_id,
        )
        .first()
    )
    if not jogo:
        raise ValueError(f"Jogo não encontrado: temporada={temporada_id} rodada={rodada} casa={time_casa_id} fora={time_fora_id}")
    return jogo

def upsert_palpite(db: Session, liga_id: int, usuario_id: int, jogo_id: int, gols_casa: int | None, gols_fora: int | None) -> Palpite:
    palpite = (
        db.query(Palpite)
        .filter(
            Palpite.liga_id == liga_id,
            Palpite.usuario_id == usuario_id,
            Palpite.jogo_id == jogo_id,
        )
        .first()
    )
    if not palpite:
        palpite = Palpite(liga_id=liga_id, usuario_id=usuario_id, jogo_id=jogo_id)
        db.add(palpite)

    palpite.placar_casa = gols_casa
    palpite.placar_fora = gols_fora
    return palpite

def main():
    # AJUSTE AQUI:
    temporada_id = 1   # temporada 2025, por exemplo
    liga_id = 1        # liga do bolão 2025
    usuario_id = 1     # substituir pelo id do usuario

    df = pd.read_csv(CSV_PALPITES)

    db = Sessionlocal()
    try:
        idx_times = montar_indice_times(db)

        total = 0
        for _, row in df.iterrows():
            rodada = int(row["rodada"])
            time_casa_nome = str(row["time_casa"])
            time_fora_nome = str(row["time_fora"])

            if pd.isna(row['gols_casa']) or pd.isna(row['gols_fora']):
                print(f"Ignorado (sem palpite): rodada={rodada} {time_casa_nome} x {time_fora_nome}")
                continue

            gols_casa = int(row["gols_casa"])
            gols_fora = int(row["gols_fora"])
            

            t_casa = achar_time(idx_times, time_casa_nome)
            t_fora = achar_time(idx_times, time_fora_nome)

            jogo = achar_jogo(db, temporada_id, rodada, t_casa.id, t_fora.id)

            palpite = upsert_palpite(db, liga_id, usuario_id, jogo.id, gols_casa, gols_fora)

            if jogo.gols_casa is not None and jogo.gols_fora is not None:
                palpite.pontos = calcular_pontuacao(
                    gols_casa_palpite=gols_casa,
                    gols_fora_palpite=gols_fora,
                    gols_casa_real=jogo.gols_casa,
                    gols_fora_real=jogo.gols_fora,
                )
            
            total += 1

        db.commit()
        print(f"✅ Import concluído. Palpites processados: {total}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
