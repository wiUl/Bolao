"""
Script de importação da Copa do Mundo 2026 — fase de grupos + mata-mata.

Fonte: https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
(domínio público, sem API key)

Rodadas:
  1-3  → Fase de grupos (rodada dentro do grupo)
  4    → 16 avos de final
  5    → Oitavas de final
  6    → Quartas de final
  7    → Semifinais
  8    → 3º lugar + Final

Uso:
  cd backend
  python scripts/import_copa_mundo_2026.py
"""

import json
import os
import re
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.competicao import Competicao
from app.models.jogo import Jogo
from app.models.temporada import Temporada
from app.models.time import Time

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bolao.db")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# ── Tradução: nome EN → (nome pt-BR, sigla FIFA, código flagcdn) ──────────────

TRADUCAO_TIMES: dict[str, tuple[str, str, str]] = {
    "Mexico":             ("México",                    "MEX", "mx"),
    "South Africa":       ("África do Sul",             "RSA", "za"),
    "South Korea":        ("Coreia do Sul",              "KOR", "kr"),
    "Czech Republic":     ("República Tcheca",           "CZE", "cz"),
    "Canada":             ("Canadá",                    "CAN", "ca"),
    "Bosnia-Herzegovina": ("Bósnia e Herzegovina",      "BIH", "ba"),
    "Qatar":              ("Catar",                     "QAT", "qa"),
    "Switzerland":        ("Suíça",                     "SUI", "ch"),
    "Brazil":             ("Brasil",                    "BRA", "br"),
    "Morocco":            ("Marrocos",                  "MAR", "ma"),
    "Haiti":              ("Haiti",                     "HAI", "ht"),
    "Scotland":           ("Escócia",                   "SCO", "gb-sct"),
    "USA":                ("Estados Unidos",            "USA", "us"),
    "Paraguay":           ("Paraguai",                  "PAR", "py"),
    "Australia":          ("Austrália",                 "AUS", "au"),
    "Turkey":             ("Turquia",                   "TUR", "tr"),
    "Germany":            ("Alemanha",                  "GER", "de"),
    "Curaçao":            ("Curaçao",                   "CUW", "cw"),
    "Ivory Coast":        ("Costa do Marfim",           "CIV", "ci"),
    "Ecuador":            ("Equador",                   "ECU", "ec"),
    "Netherlands":        ("Holanda",                   "NED", "nl"),
    "Japan":              ("Japão",                     "JPN", "jp"),
    "Sweden":             ("Suécia",                    "SWE", "se"),
    "Tunisia":            ("Tunísia",                   "TUN", "tn"),
    "Belgium":            ("Bélgica",                   "BEL", "be"),
    "Egypt":              ("Egito",                     "EGY", "eg"),
    "Iran":               ("Irã",                       "IRN", "ir"),
    "New Zealand":        ("Nova Zelândia",             "NZL", "nz"),
    "Spain":              ("Espanha",                   "ESP", "es"),
    "Cape Verde":         ("Cabo Verde",                "CPV", "cv"),
    "Saudi Arabia":       ("Arábia Saudita",            "KSA", "sa"),
    "Uruguay":            ("Uruguai",                   "URU", "uy"),
    "France":             ("França",                    "FRA", "fr"),
    "Senegal":            ("Senegal",                   "SEN", "sn"),
    "Norway":             ("Noruega",                   "NOR", "no"),
    "Iraq":               ("Iraque",                    "IRQ", "iq"),
    "Argentina":          ("Argentina",                 "ARG", "ar"),
    "Algeria":            ("Argélia",                   "ALG", "dz"),
    "Austria":            ("Áustria",                   "AUT", "at"),
    "Jordan":             ("Jordânia",                  "JOR", "jo"),
    "Portugal":           ("Portugal",                  "POR", "pt"),
    "Uzbekistan":         ("Uzbequistão",               "UZB", "uz"),
    "Colombia":           ("Colômbia",                  "COL", "co"),
    "DR Congo":           ("Rep. Democrática do Congo", "COD", "cd"),
    "England":            ("Inglaterra",                "ENG", "gb-eng"),
    "Croatia":            ("Croácia",                   "CRO", "hr"),
    "Ghana":              ("Gana",                      "GHA", "gh"),
    "Panama":             ("Panamá",                    "PAN", "pa"),
}

ALIASES: dict[str, str] = {
    "Côte d'Ivoire":          "Ivory Coast",
    "Curacao":                "Curaçao",
    "Bosnia & Herzegovina":   "Bosnia-Herzegovina",
    "Bosnia and Herzegovina": "Bosnia-Herzegovina",
    "UEFA Path A winner":     "__UEFA_A__",
    "UEFA Path B winner":     "__UEFA_B__",
    "UEFA Path C winner":     "__UEFA_C__",
    "UEFA Path D winner":     "__UEFA_D__",
    "IC Path 1 winner":       "__IC_1__",
    "IC Path 2 winner":       "__IC_2__",
}

PLACEHOLDER_RESOLVIDO: dict[str, str] = {
    "__UEFA_A__": "Bosnia-Herzegovina",
    "__UEFA_B__": "Sweden",
    "__UEFA_C__": "Turkey",
    "__UEFA_D__": "Czech Republic",
    "__IC_1__":   "DR Congo",
    "__IC_2__":   "Iraq",
}

FASE_PARA_RODADA: dict[str, int] = {
    "Round of 32":          4,
    "Round of 16":          5,
    "Quarter-final":        6,
    "Semi-final":           7,
    "Match for third place": 8,
    "Third-place":          8,
    "Final":                8,
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def parse_data_hora_utc(date_str: str, time_str: str) -> datetime:
    partes = time_str.strip().split()
    hora = partes[0]
    tz_str = partes[1].replace("UTC", "") if len(partes) > 1 else "+0"
    offset_h = 0 if tz_str in ("", "+0", "0") else int(tz_str)
    dt_local = datetime.strptime(f"{date_str} {hora}", "%Y-%m-%d %H:%M")
    return (dt_local - timedelta(hours=offset_h)).replace(tzinfo=timezone.utc)


def resolver_time(nome_original: str) -> str | None:
    """Resolve nome EN (com aliases/placeholders) para chave em TRADUCAO_TIMES."""
    nome = ALIASES.get(nome_original, nome_original)
    nome = PLACEHOLDER_RESOLVIDO.get(nome, nome)
    if nome.startswith("__"):
        return None
    return nome if nome in TRADUCAO_TIMES else None


def nome_placeholder(codigo: str) -> tuple[str, str]:
    """
    Converte código de placeholder do mata-mata em (nome pt-BR, sigla).
    Ex: "W74" → ("Vencedor Jogo 74", "W74")
        "L101" → ("Perdedor Jogo 101", "L101")
    """
    m = re.match(r"^([WL])(\d+)$", codigo)
    if m:
        tipo = "Vencedor" if m.group(1) == "W" else "Perdedor"
        return (f"{tipo} Jogo {m.group(2)}", codigo)
    return (f"A definir ({codigo})", codigo)


def obter_ou_criar_time_placeholder(session, codigo: str) -> Time:
    """Cria ou recupera um time placeholder para jogos do mata-mata."""
    time = session.query(Time).filter(Time.sigla == codigo).first()
    if not time:
        nome, sigla = nome_placeholder(codigo)
        time = Time(nome=nome, sigla=sigla, escudo_url=None)
        session.add(time)
        session.flush()
        print(f"    [+] Placeholder criado: {nome} ({sigla})")
    return time


def obter_ou_criar_time(session, nome_en: str) -> Time:
    nome_ptbr, sigla, iso2 = TRADUCAO_TIMES[nome_en]
    escudo_url = f"https://flagcdn.com/w80/{iso2.lower()}.png"

    time = (
        session.query(Time).filter(Time.sigla == sigla).first()
        or session.query(Time).filter(Time.nome == nome_ptbr).first()
    )
    if not time:
        time = Time(nome=nome_ptbr, sigla=sigla, escudo_url=escudo_url)
        session.add(time)
        session.flush()
        print(f"    [+] Time criado: {nome_ptbr} ({sigla})")
    elif getattr(time, "escudo_url", None) != escudo_url:
        time.escudo_url = escudo_url
        session.flush()
        print(f"    [~] escudo_url atualizado: {nome_ptbr} ({sigla})")
    return time


def obter_ou_criar_time_por_nome_json(session, nome_json: str) -> Time | None:
    """
    Resolve qualquer nome que venha do JSON:
    - Times reais → TRADUCAO_TIMES via ALIASES/PLACEHOLDER_RESOLVIDO
    - Placeholders do mata-mata (W74, L101) → times placeholder
    - Nomes desconhecidos → None (jogo pulado)
    """
    # Tenta resolver como time real primeiro
    nome_en = resolver_time(nome_json)
    if nome_en:
        return obter_ou_criar_time(session, nome_en)

    # Placeholder do mata-mata: W{N} ou L{N}
    if re.match(r"^[WL]\d+$", nome_json):
        return obter_ou_criar_time_placeholder(session, nome_json)

    return None


def calcular_rodada_grupo(matches_por_grupo: dict) -> dict[tuple, int]:
    resultado = {}
    for grupo, jogos in matches_por_grupo.items():
        for idx, jogo in enumerate(sorted(jogos, key=lambda j: j["date"])):
            rodada = (idx // 2) + 1
            resultado[(jogo["date"], jogo["team1_orig"], jogo["team2_orig"])] = rodada
    return resultado

# ── Main ──────────────────────────────────────────────────────────────────────

URL_JSON = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"


def main():
    session = Session()
    try:
        # 1. Competição e temporada
        print("\n=== Competição e temporada ===")
        competicao = session.query(Competicao).filter(Competicao.nome == "Copa do Mundo").first()
        if not competicao:
            competicao = Competicao(nome="Copa do Mundo", pais="Internacional", tipo="selecoes")
            session.add(competicao)
            session.flush()
            print(f"  [+] Criada: {competicao.nome}")
        else:
            print(f"  [=] Existente: {competicao.nome}")

        temporada = session.query(Temporada).filter(
            Temporada.competicao_id == competicao.id,
            Temporada.ano == 2026,
        ).first()
        if not temporada:
            temporada = Temporada(
                competicao_id=competicao.id,
                ano=2026,
                data_inicio=datetime(2026, 6, 11, tzinfo=timezone.utc),
                data_fim=datetime(2026, 7, 19, tzinfo=timezone.utc),
                status="planejada",
            )
            session.add(temporada)
            session.flush()
            print(f"  [+] Temporada 2026 criada (id={temporada.id})")
        else:
            print(f"  [=] Temporada 2026 existente (id={temporada.id})")

        # 2. Baixar JSON
        print(f"\nBaixando {URL_JSON} ...")
        req = urllib.request.Request(URL_JSON, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            dados = json.loads(resp.read().decode("utf-8"))
        print(f"  {len(dados['matches'])} partidas encontradas.")

        # 3. Separar fase de grupos e mata-mata
        matches_por_grupo: dict[str, list] = defaultdict(list)
        fases_eliminatorias: list = []

        for m in dados["matches"]:
            if m.get("group"):
                matches_por_grupo[m["group"]].append({
                    "date":       m["date"],
                    "time_str":   m.get("time", "12:00 UTC+0"),
                    "team1_orig": m["team1"],
                    "team2_orig": m["team2"],
                    "group":      m["group"],
                })
            else:
                fases_eliminatorias.append(m)

        mapa_rodadas = calcular_rodada_grupo(matches_por_grupo)

        # 4. Criar todas as seleções confirmadas
        print("\n=== Criando seleções ===")
        for nome_en in TRADUCAO_TIMES:
            obter_ou_criar_time(session, nome_en)
        session.flush()

        criados = pulados_placeholder = pulados_existentes = 0

        # 5. Fase de grupos
        print("\n=== Fase de grupos ===")
        for grupo, jogos in sorted(matches_por_grupo.items()):
            for jd in jogos:
                t1_en = resolver_time(jd["team1_orig"])
                t2_en = resolver_time(jd["team2_orig"])

                if not t1_en or not t2_en:
                    print(f"  [~] Pulando placeholder: {jd['team1_orig']} x {jd['team2_orig']} ({grupo})")
                    pulados_placeholder += 1
                    continue

                tc = obter_ou_criar_time(session, t1_en)
                tf = obter_ou_criar_time(session, t2_en)
                rodada = mapa_rodadas[(jd["date"], jd["team1_orig"], jd["team2_orig"])]
                data_hora = parse_data_hora_utc(jd["date"], jd["time_str"])

                if session.query(Jogo).filter(
                    Jogo.temporada_id == temporada.id,
                    Jogo.time_casa_id == tc.id,
                    Jogo.time_fora_id == tf.id,
                ).first():
                    pulados_existentes += 1
                    continue

                session.add(Jogo(
                    temporada_id=temporada.id,
                    rodada=rodada,
                    time_casa_id=tc.id,
                    time_fora_id=tf.id,
                    data_hora=data_hora,
                    status="agendado",
                ))
                criados += 1
                print(f"  [+] Rodada {rodada} | {grupo} | {TRADUCAO_TIMES[t1_en][0]} x {TRADUCAO_TIMES[t2_en][0]} | {data_hora.strftime('%d/%m %H:%M')} UTC")

        # 6. Mata-mata
        print("\n=== Mata-mata ===")
        for m in fases_eliminatorias:
            rodada = FASE_PARA_RODADA.get(m["round"])
            if rodada is None:
                continue

            t1_en = resolver_time(m["team1"])
            t2_en = resolver_time(m["team2"])

            # Pula se qualquer time ainda não estiver definido (W74, L101 etc.)
            if not t1_en or not t2_en:
                continue

            tc = obter_ou_criar_time(session, t1_en)
            tf = obter_ou_criar_time(session, t2_en)
            data_hora = parse_data_hora_utc(m["date"], m.get("time", "12:00 UTC+0"))

            if session.query(Jogo).filter(
                Jogo.temporada_id == temporada.id,
                Jogo.time_casa_id == tc.id,
                Jogo.time_fora_id == tf.id,
            ).first():
                pulados_existentes += 1
                continue

            session.add(Jogo(
                temporada_id=temporada.id,
                rodada=rodada,
                time_casa_id=tc.id,
                time_fora_id=tf.id,
                data_hora=data_hora,
                status="agendado",
            ))
            criados += 1
            print(f"  [+] Rodada {rodada} | {m['round']} | {tc.nome} x {tf.nome}")

        session.commit()

        print(f"\n=== Resumo ===")
        print(f"  Jogos criados:         {criados}")
        print(f"  Pulados (placeholder): {pulados_placeholder}")
        print(f"  Pulados (já existiam): {pulados_existentes}")
        print(f"  Temporada ID:          {temporada.id}")
        print("\nImportação concluída!")

    except Exception as e:
        session.rollback()
        print(f"\nERRO: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()