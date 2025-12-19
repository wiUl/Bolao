from pathlib import Path
import re
import pandas as pd

RODADA_RE = re.compile(r"Rodada\s+(\d+)", re.IGNORECASE)

BASE_DIR = Path(r"C:\Users\wiul\Documents\Projetos\Bolao\backend\scripts\dados")

ORIGEM = BASE_DIR / "Bolão dos Casados - Prova Real.csv"
SAIDA = BASE_DIR / "jogos_normalizados.csv"

def normalizar_csv_palpites_2025(caminho_csv: str) -> pd.DataFrame:
    df = pd.read_csv(caminho_csv, header=None)

    jogos = []

    n_rows, n_cols = df.shape

    # varre todas as células procurando "Rodada X"
    for r in range(n_rows):
        for c in range(n_cols):
            val = df.iat[r, c]
            if isinstance(val, str):
                m = RODADA_RE.search(val.strip())
                if not m:
                    continue

                rodada = int(m.group(1))

                # esse bloco normalmente tem 4 colunas:
                # [time_casa, gols_casa, gols_fora, time_fora] e às vezes uma 5a "Acertos"
                # então começamos a ler a partir da linha seguinte
                rr = r + 1
                while rr < n_rows:
                    time_casa = df.iat[rr, c]
                    if pd.isna(time_casa):
                        break  # fim do bloco

                    gols_casa = df.iat[rr, c + 1] if c + 1 < n_cols else None
                    gols_fora = df.iat[rr, c + 2] if c + 2 < n_cols else None
                    time_fora = df.iat[rr, c + 3] if c + 3 < n_cols else None

                    # para evitar capturar seções de resumo (ex.: "D", "GM"...)
                    if isinstance(time_casa, str) and time_casa.strip().lower() in {"d", "gm", "gs"}:
                        break

                    jogos.append(
                        {
                            "rodada": rodada,
                            "time_casa": str(time_casa).strip(),
                            "gols_casa": int(gols_casa),
                            "gols_fora": int(gols_fora),
                            "time_fora": str(time_fora).strip(),
                        }
                    )
                    rr += 1

    jogos_df = pd.DataFrame(jogos).drop_duplicates()
    jogos_df = jogos_df.sort_values(["rodada", "time_casa", "time_fora"]).reset_index(drop=True)
    return jogos_df


if __name__ == "__main__":

    jogos_df = normalizar_csv_palpites_2025(ORIGEM)
    print(jogos_df.head(20))
    print(f"Total jogos extraídos: {len(jogos_df)}")

    jogos_df.to_csv(SAIDA, index=False, encoding="utf-8")
    print(f"Arquivo gerado: {SAIDA}")
