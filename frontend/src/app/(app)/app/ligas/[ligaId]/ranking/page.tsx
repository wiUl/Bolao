"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { listarMinhasLigas } from "@/app/api/ligas";
import { getRankingGeral, getRankingPorRodada } from "@/app/api/ranking";

import type { Liga } from "@/app/types/liga";
import type { RankingGeralItem, RankingRodadaItem } from "@/app/types/ranking";

type Tab = "geral" | "rodada";

export default function RankingPage() {
  const params = useParams();
  const ligaId = Number(params?.ligaId);

  const [liga, setLiga] = useState<Liga | null>(null);

  const [tab, setTab] = useState<Tab>("geral");
  const [rodada, setRodada] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rankingGeral, setRankingGeral] = useState<RankingGeralItem[]>([]);
  const [rankingRodada, setRankingRodada] = useState<RankingRodadaItem[]>([]);

  // 1) Carrega liga (pra exibir nome no header)
  useEffect(() => {
    let mounted = true;

    async function loadLiga() {
      setErr(null);
      setLoading(true);

      try {
        if (!Number.isInteger(ligaId)) {
          setErr("ligaId inválido.");
          return;
        }

        const minhas = await listarMinhasLigas();
        const found = minhas.find((l) => l.id === ligaId) ?? null;

        if (!found) {
          setErr("Liga não encontrada ou você não participa dela.");
          setLiga(null);
          return;
        }

        if (!mounted) return;
        setLiga(found);
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    loadLiga();
    return () => {
      mounted = false;
    };
  }, [ligaId]);

  // 2) Carrega ranking
  useEffect(() => {
    if (!liga) return;
    const ligaAtual = liga;

    let mounted = true;

    async function loadRanking() {
      setErr(null);
      setLoading(true);

      try {
        if (tab === "geral") {
          const lista = await getRankingGeral(ligaAtual.id);
          if (!mounted) return;
          setRankingGeral(lista);
        } else {
          const lista = await getRankingPorRodada(ligaAtual.id, rodada);
          if (!mounted) return;
          setRankingRodada(lista);
        }
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    loadRanking();
    return () => {
      mounted = false;
    };
  }, [liga, tab, rodada]);

  const tabela = useMemo(() => {
    // garante ordenação por pontos desc. (caso backend já devolva ordenado, não atrapalha)
    if (tab === "geral") {
      return [...rankingGeral].sort((a, b) => b.pontos - a.pontos);
    }
    return [...rankingRodada].sort((a, b) => b.pontos - a.pontos);
  }, [tab, rankingGeral, rankingRodada]);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ marginTop: 0, marginBottom: 0 }}>Ranking</h1>

          <Link href={`/app/ligas/${ligaId}`} style={{ textDecoration: "none", fontWeight: 500 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 8, marginBottom: 0 }}>
          {liga ? (
            <>
              Liga: <strong>{liga.nome}</strong>
            </>
          ) : (
            "Carregando liga..."
          )}
        </p>
      </section>

      {err ? (
        <div style={alertStyle("error")}>
          <strong>Erro:</strong> {err}
        </div>
      ) : null}

      {/* Tabs */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={tab === "geral" ? tabBtnActive : tabBtn}
            onClick={() => setTab("geral")}
            disabled={loading}
          >
            Ranking geral
          </button>

          <button
            type="button"
            style={tab === "rodada" ? tabBtnActive : tabBtn}
            onClick={() => setTab("rodada")}
            disabled={loading}
          >
            Ranking por rodada
          </button>
        </div>

        {tab === "rodada" ? (
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              style={secondaryBtnStyle}
              onClick={() => setRodada((r) => Math.max(1, r - 1))}
              disabled={rodada <= 1 || loading}
            >
              ← Anterior
            </button>

            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Rodada:</span>
              <input
                type="number"
                value={rodada}
                onChange={(e) => setRodada(Math.max(1, Number(e.target.value)))}
                min={1}
                style={{ ...inputStyle, width: 120 }}
                disabled={loading}
              />
            </label>

            <button
              type="button"
              style={secondaryBtnStyle}
              onClick={() => setRodada((r) => r + 1)}
              disabled={loading}
            >
              Próxima →
            </button>
          </div>
        ) : null}
      </section>

      {/* Tabela */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>
            {tab === "geral" ? "Classificação geral" : `Classificação — rodada ${rodada}`}
          </h2>
          {loading ? <span style={{ fontSize: 14, opacity: 0.75 }}>Carregando...</span> : null}
        </div>

        {!loading && tabela.length === 0 ? <p style={{ marginTop: 12 }}>Sem dados para exibir.</p> : null}

        {!loading && tabela.length > 0 ? (
          <div style={{ overflowX: "auto", marginTop: 12 }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Pontos</th>
                  <th style={thStyle}>Placar</th>
                  <th style={thStyle}>Saldo</th>
                  <th style={thStyle}>Resultado</th>

                  {tab === "geral" ? (
                    <>
                      <th style={thStyle}>Erros</th>
                      <th style={thStyle}>Aproveit.</th>
                      <th style={thStyle}>% Placar</th>
                      <th style={thStyle}>% Saldo</th>
                      <th style={thStyle}>% Result.</th>
                    </>
                  ) : null}
                </tr>
              </thead>

              <tbody>
                {tabela.map((row: any, idx: number) => (
                  <tr key={`${row.nome}-${idx}`}>
                    <td style={tdStyle}>{idx + 1}</td>
                    <td style={tdStyleStrong}>{row.nome}</td>
                    <td style={tdStyle}>{row.pontos}</td>
                    <td style={tdStyle}>{row.acertos_placar}</td>
                    <td style={tdStyle}>{row.acertos_saldo}</td>
                    <td style={tdStyle}>{row.acertos_resultado}</td>

                    {tab === "geral" ? (
                      <>
                        <td style={tdStyle}>{row.erros}</td>
                        <td style={tdStyle}>{formatPercent(row.aproveitamento)}</td>
                        <td style={tdStyle}>{formatPercent(row.perc_placar)}</td>
                        <td style={tdStyle}>{formatPercent(row.perc_saldo)}</td>
                        <td style={tdStyle}>{formatPercent(row.perc_resultado)}</td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function formatPercent(v: number) {
  // seu backend pode mandar 0-100 ou 0-1. Vamos lidar com ambos.
  if (v == null || Number.isNaN(v)) return "—";
  const n = v > 1 ? v : v * 100;
  return `${n.toFixed(1)}%`;
}

/** Evita "[object Object]" com FastAPI */
function extractApiErrorMessage(e: any): string {
  const data = e?.response?.data;
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const msgs = detail
      .map((x) => (typeof x?.msg === "string" ? x.msg : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(" | ");
    return JSON.stringify(detail);
  }

  if (typeof data?.message === "string") return data.message;
  if (typeof data === "string") return data;
  if (data) return JSON.stringify(data);

  return e?.message || "Erro inesperado.";
}

function alertStyle(kind: "error" | "success"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  };
  return kind === "error"
    ? { ...base, borderColor: "#f3c2c2" }
    : { ...base, borderColor: "#b7e3c5" };
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 10,
  padding: "10px 12px",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
};

const tabBtn: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

const tabBtnActive: React.CSSProperties = {
  ...tabBtn,
  borderColor: "#bbb",
  background: "#f7f7f7",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 820,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: 13,
  padding: "10px 10px",
  borderBottom: "1px solid #eee",
  opacity: 0.75,
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 10px",
  borderBottom: "1px solid #f3f3f3",
  whiteSpace: "nowrap",
};

const tdStyleStrong: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 700,
};
