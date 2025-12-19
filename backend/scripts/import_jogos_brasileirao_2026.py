import json
import re
import unicodedata
from pathlib import Path
from dateutil import parser as dtparser
from sqlalchemy.orm import Session

from app.database import Sessionlocal
from app.models.time import Time
from app.models.jogo import Jogo

rodada_re = re.compile(r"(\d+)")

SIGLA_MAP = {
    "BGT": "RBB",   # API -> BANCO
}

def extrair_numero_rodada(chave: str) -> int:
    m = rodada_re.search(chave)
    if not m:
        raise ValueError(f"Não conseguiu extrair rodada de: {chave}")
    
    return int(m.group(1))

def normalizar_nome(s: str) -> str:
    s = s.strip().lower()
    s = unicodedata.normalize("NFKD",s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))

    for ch in ["-", "_", ".", ","]:
        s.replace(ch, " ")
    
    s = " ".join(s.split())

    return s

def buscar_time(db: Session, sigla: str | None, nome_popular: str | None) -> Time:
    if sigla:
        sigla = SIGLA_MAP.get(sigla.upper(), sigla.upper())
        t = db.query(Time).filter(Time.sigla == sigla).first()
        if t:
            return t
        
    if nome_popular:
        alvo = normalizar_nome(nome_popular)

        times = db.query(Time).all()
        for t in times:
            if t.nome and normalizar_nome(t.nome) == alvo:
                return t
            
    raise ValueError(f"Time não encontrado no banco. sigla={sigla}, nome={nome_popular}")


def upsert_jogo(db: Session, temporada_id: int, rodada: int, time_casa_id: int, time_fora_id: int, data_hora, status: str, placar_casa, placar_fora):
    jogo = db.query(Jogo).filter(
        Jogo.temporada_id == temporada_id,
        Jogo.rodada == rodada,
        Jogo.time_casa_id == time_casa_id,
        Jogo.time_fora_id == time_fora_id,
    ).first()

    if not jogo:
        jogo = Jogo(
            temporada_id = temporada_id,
            rodada = rodada,
            time_casa_id = time_casa_id,
            time_fora_id = time_fora_id
        )
        db.add(jogo)

    
    jogo.data_hora = data_hora
    jogo.status = status
    jogo.gols_casa = placar_casa
    jogo.gols_fora = placar_fora

    return jogo


def main():
    temporada_id = 2
    BASE_DIR = Path(__file__).resolve().parent 
    caminho = BASE_DIR / "dados" / "partidas_2026.json"
    

    payload = json.loads(caminho.read_text(encoding="utf-8"))
    partidas_por_rodada = payload.get("partidas")
    if not partidas_por_rodada:
        raise RuntimeError("Não achei a palavra 'partidas' no JSON.")
    
    db = Sessionlocal()
    try:
        total = 0
        for chave_rodada, partidas in partidas_por_rodada.items():
            rodada = extrair_numero_rodada(chave_rodada)

            for p in partidas:
                mandante = p["time_mandante"]
                visitante = p["time_visitante"]

                t_casa = buscar_time(db, mandante.get("sigla"), mandante.get("nome_popular"))
                t_fora = buscar_time(db, visitante.get("sigla"), visitante.get("nome_popular"))

                data_hora = dtparser.parse(p["data_realizacao_iso"] if p.get("data_realizacao_iso") else None)
                status = p.get("status")
                placar_casa = p.get("placar_mandante")
                placar_fora = p.get("placar_visitante")

                upsert_jogo(db=db, temporada_id=temporada_id, rodada=rodada, time_casa_id=t_casa.id, time_fora_id=t_fora.id, data_hora=data_hora, status=status, placar_casa=placar_casa, placar_fora=placar_fora)
                total += 1
            
            db.commit()
            print(f"✅ Import finalizado. Jogos processados: {total}")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()

