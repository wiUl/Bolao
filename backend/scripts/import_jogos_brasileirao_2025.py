import unicodedata
import pandas as pd
from pathlib import Path
from sqlalchemy.orm import Session

from app.database import Sessionlocal
from app.models.time import Time
from app.models.jogo import Jogo


BASE_DIR = Path(r"C:\Users\wiul\Documents\Projetos\Bolao\backend\scripts\dados")
CSV_PATH = BASE_DIR / "jogos_normalizados.csv"

NOME_MAP = {
    "bragantino": "rb bragantino",   # CSV -> BANCO
    "atlético mg": "atletico mineiro",
    "atletico mg": "atletico mineiro",
    "vasco": "vasco da gama"
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
    """Mapa nome_normalizado -> Time (para buscar rápido)."""
    times = db.query(Time).all()
    idx = {}
    for t in times:
        if getattr(t, "nome", None):
            idx[normalizar_nome(t.nome)] = t
    return idx


def achar_time(idx: dict[str, Time], nome_csv: str) -> Time:
    key = normalizar_nome(nome_csv)

    # 1) direto
    if key in idx:
        return idx[key]

    # 2) alias
    alias = NOME_MAP.get(key)
    if alias and alias in idx:
        return idx[alias]

    raise ValueError(
        f"Time não encontrado. CSV='{nome_csv}' | normalizado='{key}' | alias='{alias}'"
    )


def upsert_jogo(
    db: Session,
    temporada_id: int,
    rodada: int,
    time_casa_id: int,
    time_fora_id: int,
    placar_casa: int,
    placar_fora: int,
    status: str,
):
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
        jogo = Jogo(
            temporada_id=temporada_id,
            rodada=rodada,
            time_casa_id=time_casa_id,
            time_fora_id=time_fora_id,
        )
        db.add(jogo)

    jogo.gols_casa = placar_casa
    jogo.gols_fora = placar_fora
    jogo.status = status
    # sem data no CSV:
    jogo.data_hora = None

    return jogo


def main():
    # AJUSTE AQUI:
    temporada_id = 1  # <- coloque o id da Temporada (ex: Temporada 2025)
    status_encerrado = "finalizado"  # <- ajuste para o valor que seu model usa

    df = pd.read_csv(CSV_PATH)

    db = Sessionlocal()
    try:
        idx_times = montar_indice_times(db)

        total = 0
        for _, row in df.iterrows():
            rodada = int(row["rodada"])
            time_casa_nome = str(row["time_casa"])
            time_fora_nome = str(row["time_fora"])
            gols_casa_raw = row["gols_casa"]
            gols_fora_raw = row["gols_fora"]
            gols_casa = int(gols_casa_raw) if pd.notna(gols_casa_raw) else None
            gols_fora = int(gols_fora_raw) if pd.notna(gols_fora_raw) else None

            t_casa = achar_time(idx_times, time_casa_nome)
            t_fora = achar_time(idx_times, time_fora_nome)

            upsert_jogo(
                db=db,
                temporada_id=temporada_id,
                rodada=rodada,
                time_casa_id=t_casa.id,
                time_fora_id=t_fora.id,
                placar_casa=gols_casa,
                placar_fora=gols_fora,
                status=status_encerrado,
            )
            total += 1

        db.commit()
        print(f"✅ Import concluído. Jogos processados: {total}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
