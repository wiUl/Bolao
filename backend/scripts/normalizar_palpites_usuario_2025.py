import re
import pandas as pd
from pathlib import Path

RODADA_RE = re.compile(r"Rodada\s+(\d+)", re.IGNORECASE)

BASE_DADOS = Path(r"C:\Users\wiul\Documents\Projetos\Bolao\backend\scripts\dados")

def extrair_numero_rodada(s: str) -> int:
    m = RODADA_RE.search(s.strip())
    if not m:
        raise ValueError(f"Não consegui extrair rodada de: {s!r}")
    return int(m.group(1))

def normalizar_palpite_csv(caminho_csv: Path, usuario_slug: str) -> Path:
    """
    Lê um CSV no formato 'blocos lado a lado' (Rodada X) e gera
    um CSV linear: rodada,time_casa,time_fora,gols_casa,gols_fora
    """
    df = pd.read_csv(caminho_csv, header=None)

    palpites = []
    n_rows, n_cols = df.shape

    for r in range(n_rows):
        for c in range(n_cols):
            val = df.iat[r, c]
            if isinstance(val, str) and "rodada" in val.lower():
                rodada = extrair_numero_rodada(val)

                rr = r + 1
                while rr < n_rows:
                    time_casa = df.iat[rr, c]
                    if pd.isna(time_casa):
                        break

                    # evita blocos de resumo (se existirem)
                    if isinstance(time_casa, str) and time_casa.strip().lower() in {"d", "gm", "gs", "saldo"}:
                        break

                    gols_casa = df.iat[rr, c + 1] if c + 1 < n_cols else None
                    gols_fora = df.iat[rr, c + 2] if c + 2 < n_cols else None
                    time_fora = df.iat[rr, c + 3] if c + 3 < n_cols else None

                    # pula linhas muito "quebradas"
                    if pd.isna(time_fora):
                        break

                    # alguns CSVs podem ter célula vazia de palpite; mantém como None
                    gc = int(gols_casa) if pd.notna(gols_casa) else None
                    gf = int(gols_fora) if pd.notna(gols_fora) else None

                    palpites.append(
                        {
                            "rodada": rodada,
                            "time_casa": str(time_casa).strip(),
                            "time_fora": str(time_fora).strip(),
                            "gols_casa": gc,
                            "gols_fora": gf,
                        }
                    )
                    rr += 1

    out_df = (
        pd.DataFrame(palpites)
        .drop_duplicates()
        .sort_values(["rodada", "time_casa", "time_fora"])
        .reset_index(drop=True)
    )

    saida = BASE_DADOS / f"palpites_{usuario_slug}.csv"
    out_df.to_csv(saida, index=False, encoding="utf-8")
    return saida


if __name__ == "__main__":
    # AJUSTE AQUI:
    usuario_slug = "willian"  # só para nomear o arquivo
    origem = BASE_DADOS / "Bolão dos Casados - Willian.csv"

    saida = normalizar_palpite_csv(origem, usuario_slug)
    print(f"✅ Gerado: {saida}")
