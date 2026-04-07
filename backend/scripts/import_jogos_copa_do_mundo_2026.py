"""
Script de importação da Copa do Mundo 2026 — fase de grupos.

Fonte dos dados: https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json
(domínio público, sem necessidade de API key)

O que o script faz:
  1. Baixa o JSON oficial da openfootball
  2. Cria a Competição "Copa do Mundo" e a Temporada 2026 (se não existirem)
  3. Cria as 48 seleções como Times (se não existirem), com nome em pt-BR e sigla FIFA
  4. Importa os 72 jogos da fase de grupos com:
     - Rodada 1, 2 ou 3 (por rodada dentro do grupo, não pelo matchday global)
     - data_hora convertida para UTC (os fusos do JSON variam por sede)
     - Pula jogos cujos times ainda não foram definidos (repescagens pendentes)

Uso:
  cd backend
  python scripts/import_copa_mundo_2026.py

  # Ou apontando para outro banco:
  DATABASE_URL=postgresql://user:pass@host/db python scripts/import_copa_mundo_2026.py
"""

import json
import os
import sys
import urllib.request
from datetime import datetime, timezone, timedelta
from collections import defaultdict

# Adiciona o diretório pai ao path para importar os modelos
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models.competicao import Competicao
from app.models.temporada import Temporada
from app.models.time import Time
from app.models.jogo import Jogo
from app.database import Base

# ─── Configuração do banco ────────────────────────────────────────────────────

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./bolao.db")

# SQLAlchemy não aceita "postgres://" (somente "postgresql://")
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# ─── Tradução: nome em inglês → (nome_ptbr, sigla_fifa, iso2) ─────────────────
#
# Inclui os 42 classificados confirmados + os 6 nomes de placeholder para as
# vagas ainda em disputa nas repescagens (serão pulados na importação dos jogos,
# mas estão aqui caso você queira criá-los manualmente depois).

TRADUCAO_TIMES: dict[str, tuple[str, str, str]] = {
    # Grupo A
    "Mexico":              ("México",                       "MEX", "mx"),
    "South Africa":        ("África do Sul",                "RSA", "za"),
    "South Korea":         ("Coreia do Sul",                "KOR", "kr"),
    "Czech Republic":      ("República Tcheca",             "CZE", "cz"),
    # Grupo B
    "Canada":              ("Canadá",                       "CAN", "ca"),
    "Bosnia-Herzegovina":  ("Bósnia e Herzegovina",         "BIH", "ba"),
    "Qatar":               ("Catar",                        "QAT", "qa"),
    "Switzerland":         ("Suíça",                        "SUI", "ch"),
    # Grupo C
    "Brazil":              ("Brasil",                       "BRA", "br"),
    "Morocco":             ("Marrocos",                     "MAR", "ma"),
    "Haiti":               ("Haiti",                        "HAI", "ht"),
    "Scotland":            ("Escócia",                      "SCO", "gb-sct"),
    # Grupo D
    "USA":                 ("Estados Unidos",               "USA", "us"),
    "Paraguay":            ("Paraguai",                     "PAR", "py"),
    "Australia":           ("Austrália",                    "AUS", "au"),
    "Turkey":              ("Turquia",                      "TUR", "tr"),
    # Grupo E
    "Germany":             ("Alemanha",                     "GER", "de"),
    "Curaçao":             ("Curaçao",                      "CUW", "cw"),
    "Ivory Coast":         ("Costa do Marfim",              "CIV", "ci"),
    "Ecuador":             ("Equador",                      "ECU", "ec"),
    # Grupo F
    "Netherlands":         ("Holanda",                      "NED", "nl"),
    "Japan":               ("Japão",                        "JPN", "jp"),
    "Sweden":              ("Suécia",                       "SWE", "se"),
    "Tunisia":             ("Tunísia",                      "TUN", "tn"),
    # Grupo G
    "Belgium":             ("Bélgica",                      "BEL", "be"),
    "Egypt":               ("Egito",                        "EGY", "eg"),
    "Iran":                ("Irã",                          "IRN", "ir"),
    "New Zealand":         ("Nova Zelândia",                "NZL", "nz"),
    # Grupo H
    "Spain":               ("Espanha",                      "ESP", "es"),
    "Cape Verde":          ("Cabo Verde",                   "CPV", "cv"),
    "Saudi Arabia":        ("Arábia Saudita",               "KSA", "sa"),
    "Uruguay":             ("Uruguai",                      "URU", "uy"),
    # Grupo I
    "France":              ("França",                       "FRA", "fr"),
    "Senegal":             ("Senegal",                      "SEN", "sn"),
    "Norway":              ("Noruega",                      "NOR", "no"),
    "Iraq":                ("Iraque",                       "IRQ", "iq"),
    # Grupo J
    "Argentina":           ("Argentina",                    "ARG", "ar"),
    "Algeria":             ("Argélia",                      "ALG", "dz"),
    "Austria":             ("Áustria",                      "AUT", "at"),
    "Jordan":              ("Jordânia",                     "JOR", "jo"),
    # Grupo K
    "Portugal":            ("Portugal",                     "POR", "pt"),
    "Uzbekistan":          ("Uzbequistão",                  "UZB", "uz"),
    "Colombia":            ("Colômbia",                     "COL", "co"),
    "DR Congo":            ("Rep. Democrática do Congo",    "COD", "cd"),
    # Grupo L
    "England":             ("Inglaterra",                   "ENG", "gb-eng"),
    "Croatia":             ("Croácia",                      "CRO", "hr"),
    "Ghana":               ("Gana",                         "GHA", "gh"),
    "Panama":              ("Panamá",                       "PAN", "pa"),
}

# Nomes alternativos que o JSON pode usar para o mesmo time
ALIASES: dict[str, str] = {
    # O JSON da openfootball usa esses nomes; mapeamos para a chave padrão acima
    "Côte d'Ivoire":                    "Ivory Coast",
    "Curacao":                          "Curaçao",
    "Bosnia and Herzegovina":           "Bosnia-Herzegovina",
    "Czech Republic":                   "Czech Republic",
    # Placeholders das repescagens (serão resolvidos quando os times forem definidos)
    "UEFA Path A winner":               "__UEFA_A__",
    "UEFA Path B winner":               "__UEFA_B__",
    "UEFA Path C winner":               "__UEFA_C__",
    "UEFA Path D winner":               "__UEFA_D__",
    "IC Path 1 winner":                 "__IC_1__",
    "IC Path 2 winner":                 "__IC_2__",
}

# Resolução dos placeholders (atualize quando as repescagens forem definidas)
# Com base nos resultados já conhecidos:
PLACEHOLDER_RESOLVIDO: dict[str, str] = {
    "__UEFA_A__": "Bosnia-Herzegovina",   # Grupo B
    "__UEFA_B__": "Sweden",               # Grupo F
    "__UEFA_C__": "Turkey",               # Grupo D
    "__UEFA_D__": "Czech Republic",       # Grupo A
    "__IC_1__":   "DR Congo",             # Grupo K
    "__IC_2__":   "Iraq",                 # Grupo I
}

# ─── Mapeamento de fuso horário do JSON ──────────────────────────────────────
# O JSON usa "HH:MM UTC±N" — extraímos o offset para converter para UTC

def parse_data_hora_utc(date_str: str, time_str: str) -> datetime:
    """Converte "2026-06-11" + "13:00 UTC-6" para datetime UTC."""
    # time_str pode ser "13:00 UTC-6" ou "13:00 UTC+3" ou "13:00 UTC-4"
    partes = time_str.strip().split()
    hora = partes[0]                  # "13:00"
    tz_str = partes[1] if len(partes) > 1 else "UTC+0"  # "UTC-6"

    # Extrai o offset numérico
    tz_str = tz_str.replace("UTC", "")
    if tz_str == "" or tz_str == "+0" or tz_str == "0":
        offset_h = 0
    elif tz_str.startswith("+"):
        offset_h = int(tz_str[1:])
    else:
        offset_h = int(tz_str)        # já inclui o sinal negativo

    h, m = map(int, hora.split(":"))
    dt_local = datetime.strptime(f"{date_str} {hora}", "%Y-%m-%d %H:%M")
    offset = timedelta(hours=offset_h)
    # local = utc + offset  →  utc = local - offset
    dt_utc = (dt_local - offset).replace(tzinfo=timezone.utc)
    return dt_utc

# ─── Lógica de rodada ─────────────────────────────────────────────────────────
#
# A Copa tem 17 "Matchdays" globais, mas cada grupo joga em apenas 3 deles.
# Para o bolão, queremos:
#   Rodada 1 = 1ª rodada de cada grupo  (todos os 24 jogos da 1ª rodada)
#   Rodada 2 = 2ª rodada de cada grupo  (24 jogos)
#   Rodada 3 = 3ª rodada de cada grupo  (24 jogos, simultâneos por grupo)
#   Rodada 4 = 16 avos de final
#   Rodada 5 = Oitavas
#   Rodada 6 = Quartas
#   Rodada 7 = Semifinais
#   Rodada 8 = 3º lugar + Final
#
# Estratégia: para cada grupo, ordena os jogos por data e atribui
# rodada 1 aos 2 primeiros, rodada 2 aos 2 do meio, rodada 3 aos 2 últimos.

FASE_PARA_RODADA: dict[str, int] = {
    "Round of 32":    4,
    "Round of 16":    5,
    "Quarter-final":  6,
    "Semi-final":     7,
    "Third-place":    8,
    "Final":          8,
}

def calcular_rodada_grupo(matches_por_grupo: dict) -> dict[tuple, int]:
    """
    Retorna um dict: (date, team1, team2) -> rodada (1, 2 ou 3)
    para todos os jogos da fase de grupos.
    """
    resultado = {}
    for grupo, jogos in matches_por_grupo.items():
        # Ordena por data para determinar a ordem dentro do grupo
        jogos_ordenados = sorted(jogos, key=lambda j: j["date"])
        for idx, jogo in enumerate(jogos_ordenados):
            rodada = (idx // 2) + 1   # 0,1 → 1 | 2,3 → 2 | 4,5 → 3
            chave = (jogo["date"], jogo["team1_orig"], jogo["team2_orig"])
            resultado[chave] = rodada
    return resultado

# ─── Download do JSON ─────────────────────────────────────────────────────────

URL_JSON = "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"

def baixar_json() -> dict:
    print(f"Baixando dados de {URL_JSON} ...")
    req = urllib.request.Request(URL_JSON, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        dados = json.loads(resp.read().decode("utf-8"))
    print(f"  {len(dados['matches'])} partidas encontradas.")
    return dados

# ─── Helpers ─────────────────────────────────────────────────────────────────

def resolver_time(nome_original: str) -> str | None:
    """
    Resolve o nome do time (com aliases e placeholders) para a chave
    em TRADUCAO_TIMES. Retorna None se for um placeholder não resolvido.
    """
    nome = ALIASES.get(nome_original, nome_original)
    nome = PLACEHOLDER_RESOLVIDO.get(nome, nome)
    if nome.startswith("__"):
        return None   # placeholder ainda não resolvido
    if nome not in TRADUCAO_TIMES:
        return None
    return nome


def montar_escudo_url(iso2: str) -> str:
    """
    Monta a URL da bandeira no FlagCDN.

    Observação: para Inglaterra e Escócia, o FlagCDN usa códigos próprios
    (gb-eng e gb-sct), então o campo `iso2` aqui representa o código aceito
    pela CDN, não necessariamente um ISO 3166-1 alpha-2 puro.
    """
    return f"https://flagcdn.com/w80/{iso2.lower()}.png"

def obter_ou_criar_time(session, nome_en: str) -> Time | None:
    nome_ptbr, sigla, iso2 = TRADUCAO_TIMES[nome_en]
    escudo_url = montar_escudo_url(iso2)

    time = session.query(Time).filter(Time.sigla == sigla).first()
    if not time:
        time = session.query(Time).filter(Time.nome == nome_ptbr).first()

    if not time:
        time = Time(nome=nome_ptbr, sigla=sigla, escudo_url=escudo_url)
        session.add(time)
        session.flush()
        print(f"    [+] Time criado: {nome_ptbr} ({sigla}) | escudo_url={escudo_url}")
    elif getattr(time, "escudo_url", None) != escudo_url:
        time.escudo_url = escudo_url
        session.flush()
        print(f"    [~] escudo_url atualizado: {nome_ptbr} ({sigla}) | {escudo_url}")

    return time

# ─── Script principal ─────────────────────────────────────────────────────────

def main():
    session = Session()

    try:
        # 1. Competição e temporada
        print("\n=== Competição e temporada ===")
        competicao = session.query(Competicao).filter(
            Competicao.nome == "Copa do Mundo"
        ).first()
        if not competicao:
            competicao = Competicao(
                nome="Copa do Mundo",
                pais="Internacional",
                tipo="selecoes",
            )
            session.add(competicao)
            session.flush()
            print(f"  [+] Competição criada: {competicao.nome}")
        else:
            print(f"  [=] Competição existente: {competicao.nome}")

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
            print(f"  [+] Temporada criada: 2026 (id={temporada.id})")
        else:
            print(f"  [=] Temporada existente: 2026 (id={temporada.id})")

        # 2. Baixa e processa o JSON
        dados = baixar_json()

        # 3. Separar jogos por grupo e calcular rodadas
        matches_por_grupo: dict[str, list] = defaultdict(list)
        fases_especiais = []

        for m in dados["matches"]:
            round_name = m["round"]
            group = m.get("group", "")

            if group:
                # Fase de grupos
                t1_orig = m["team1"]
                t2_orig = m["team2"]
                matches_por_grupo[group].append({
                    "date":       m["date"],
                    "time_str":   m.get("time", "12:00 UTC+0"),
                    "team1_orig": t1_orig,
                    "team2_orig": t2_orig,
                    "group":      group,
                    "ground":     m.get("ground", ""),
                })
            else:
                fases_especiais.append(m)

        mapa_rodadas = calcular_rodada_grupo(matches_por_grupo)

        # 4. Criar times (apenas os confirmados)
        print("\n=== Criando seleções ===")
        for nome_en in TRADUCAO_TIMES:
            obter_ou_criar_time(session, nome_en)
        session.flush()

        # 5. Importar jogos da fase de grupos
        print("\n=== Importando jogos da fase de grupos ===")
        criados = 0
        pulados_placeholder = 0
        pulados_existentes = 0

        for grupo, jogos in sorted(matches_por_grupo.items()):
            for jogo_data in jogos:
                t1_orig = jogo_data["team1_orig"]
                t2_orig = jogo_data["team2_orig"]

                # Resolve nomes
                t1_en = resolver_time(t1_orig)
                t2_en = resolver_time(t2_orig)

                if t1_en is None or t2_en is None:
                    print(f"  [~] Pulando (placeholder): {t1_orig} x {t2_orig} ({grupo})")
                    pulados_placeholder += 1
                    continue

                time_casa = obter_ou_criar_time(session, t1_en)
                time_fora = obter_ou_criar_time(session, t2_en)

                chave = (jogo_data["date"], t1_orig, t2_orig)
                rodada = mapa_rodadas[chave]

                data_hora = parse_data_hora_utc(jogo_data["date"], jogo_data["time_str"])

                # Verifica se já existe
                existente = session.query(Jogo).filter(
                    Jogo.temporada_id == temporada.id,
                    Jogo.time_casa_id == time_casa.id,
                    Jogo.time_fora_id == time_fora.id,
                ).first()

                if existente:
                    pulados_existentes += 1
                    continue

                jogo = Jogo(
                    temporada_id=temporada.id,
                    rodada=rodada,
                    time_casa_id=time_casa.id,
                    time_fora_id=time_fora.id,
                    data_hora=data_hora,
                    status="agendado",
                )
                session.add(jogo)
                criados += 1

                nome_casa = TRADUCAO_TIMES[t1_en][0]
                nome_fora = TRADUCAO_TIMES[t2_en][0]
                print(f"  [+] Rodada {rodada} | {grupo} | "
                      f"{nome_casa} x {nome_fora} | "
                      f"{data_hora.strftime('%d/%m/%Y %H:%M')} UTC")

        # 6. Importar fases eliminatórias (apenas estrutura, sem times definidos)
        print("\n=== Fases eliminatórias ===")
        print("  (Jogos do mata-mata não são importados agora — times ainda não definidos)")
        print(f"  Total de partidas eliminatórias no JSON: {len(fases_especiais)}")
        print("  Execute este script novamente após o fim da fase de grupos para importá-los.")

        session.commit()

        print(f"\n=== Resumo ===")
        print(f"  Jogos criados:         {criados}")
        print(f"  Pulados (placeholder): {pulados_placeholder}")
        print(f"  Pulados (já existiam): {pulados_existentes}")
        print(f"  Temporada ID:          {temporada.id}")
        print("\nImportação concluída com sucesso!")

    except Exception as e:
        session.rollback()
        print(f"\nERRO: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    main()