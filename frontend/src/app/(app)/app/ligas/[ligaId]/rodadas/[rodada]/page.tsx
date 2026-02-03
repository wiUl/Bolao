"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";


import { listarMinhasLigas } from "@/app/api/ligas";
import { listarJogos } from "@/app/api/jogos";
import {
  listarMeusPalpitesNaRodada,
  listarPalpitesDoJogoNaLiga,
} from "@/app/api/palpites";

import type { Liga } from "@/app/types/liga";
import type { Jogo } from "@/app/types/jogo";
import type { MeuPalpiteRodadaItem } from "@/app/types/palpite";
import type { PalpiteLigaJogoItem } from "@/app/types/palpiteLigaJogo";

import { formatDateTimeSP } from "@/app/utils/datetime";


export default function RodadaLigaPage() {
  const params = useParams();
  const ligaId = Number(params?.ligaId);
  const rodada = Number(params?.rodada);
  const router = useRouter();

  
  const [rodadaInput, setRodadaInput] = useState<number>(rodada);


  const [liga, setLiga] = useState<Liga | null>(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [meusPalpites, setMeusPalpites] = useState<MeuPalpiteRodadaItem[]>([]);
  const meusPalpitesMap = useMemo(() => {
    const m = new Map<number, MeuPalpiteRodadaItem>();
    for (const p of meusPalpites) m.set(p.jogo_id, p);
    return m;
  }, [meusPalpites]);

  // palpites por jogo
  const [palpitesPorJogo, setPalpitesPorJogo] = useState<Record<number, PalpiteLigaJogoItem[]>>({});
  const [aberto, setAberto] = useState<Record<number, boolean>>({});

  // 1) carregar liga
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
        if (!Number.isInteger(rodada) || rodada < 1) {
          setErr("Rodada inválida.");
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
  }, [ligaId, rodada]);

  // 2) carregar jogos + meus palpites
  useEffect(() => {
    if (!liga) return;
    const ligaAtual = liga;

    let mounted = true;

    async function loadRodada() {
      setErr(null);
      setLoading(true);

      try {
        const [listaJogos, meus] = await Promise.all([
          listarJogos({ temporada_id: ligaAtual.temporada_id, rodada }),
          listarMeusPalpitesNaRodada(ligaAtual.id, rodada),
        ]);

        if (!mounted) return;

        setJogos(listaJogos);
        setMeusPalpites(meus);

        // zera caches ao trocar rodada
        setPalpitesPorJogo({});
        setAberto({});
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    loadRodada();
    return () => {
      mounted = false;
    };
  }, [liga, rodada]);

  useEffect(() => {
  setRodadaInput(rodada);
  }, [rodada]);


  async function togglePalpites(jogoId: number) {
    setErr(null);

    // abre/fecha
    setAberto((prev) => ({ ...prev, [jogoId]: !prev[jogoId] }));

    // se já tem cache, não busca de novo
    if (palpitesPorJogo[jogoId]) return;

    try {
      const lista = await listarPalpitesDoJogoNaLiga(ligaId, jogoId);
      // ordena por pontos desc (opcional)
      lista.sort((a, b) => (b.pontos ?? -999) - (a.pontos ?? -999));

      setPalpitesPorJogo((prev) => ({ ...prev, [jogoId]: lista }));
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    }
  }

  function irParaRodada(n: number) {
    const alvo = Math.max(1, n);
    router.push(`/app/ligas/${ligaId}/rodadas/${alvo}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ marginTop: 0, marginBottom: 6, fontWeight: 600 }}>Rodada {rodada}</h1>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={() => irParaRodada(rodada - 1)}
                disabled={loading || rodada <= 1}
              >
                ← Anterior
              </button>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>Número:</span>
                <input
                  type="number"
                  min={1}
                  value={rodadaInput}
                  onChange={(e) => setRodadaInput(Math.max(1, Number(e.target.value)))}
                  style={{ ...inputStyle, width: 110 }}
                  disabled={loading}
                />
              </label>

              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={() => irParaRodada(rodadaInput)}
                disabled={loading}
                title="Ir para a rodada informada"
              >
                Ir
              </button>

              <button
                type="button"
                style={secondaryBtnStyle}
                onClick={() => irParaRodada(rodada + 1)}
                disabled={loading}
              >
                Próxima →
              </button>
            </div>
          </div>

          <Link href={`/app/ligas/${ligaId}`} style={{ textDecoration: "none", fontWeight: 600 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0 }}>
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

      {/* Jogos */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>Jogos</h2>
          {loading ? <span style={{ fontSize: 14, opacity: 0.75 }}>Carregando...</span> : null}
        </div>

        {!loading && jogos.length === 0 ? <p style={{ marginTop: 12 }}>Nenhum jogo encontrado.</p> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {jogos.map((j) => {
            const meu = meusPalpitesMap.get(j.id) ?? null;
            const lista = palpitesPorJogo[j.id] ?? null;
            const isOpen = !!aberto[j.id];

            return (
              <div key={j.id} style={gameCard}>
                {/* topo */}
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div className="flex items font-bold gap-2.5">
                    <img
                          src={getEscudoSrcByTime(j.time_casa)}
                          alt={`Escudo ${j.time_casa.nome}`}
                          style={{ width: 28, height: 28, objectFit: "contain" }}
                          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                        />
                      {j.time_casa.nome} <span style={{ opacity: 0.7 }}>X</span> {j.time_fora.nome}
                    <img
                          src={getEscudoSrcByTime(j.time_fora)}
                          alt={`Escudo ${j.time_fora.nome}`}
                          style={{ width: 28, height: 28, objectFit: "contain" }}
                          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                        />
                      
                    </div>
                    <div style={{ fontSize: 14, opacity: 0.85 }}>
                      {formatDateTimeSP(j.data_hora)} • Status: <code>{j.status}</code>
                    </div>
                  </div>

                  {meu ? (
                    <div style={{ fontSize: 14 }}>
                      Meu palpite:{" "}
                      <strong>
                        {meu.palpite_casa ?? "—"} x {meu.palpite_fora ?? "—"}
                      </strong>
                      {meu.pontos != null ? (
                        <span style={{ marginLeft: 8 }}>
                          (pontos: <strong>{meu.pontos}</strong>)
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <div style={{ fontSize: 14, opacity: 0.8 }}>Você ainda não palpitou</div>
                  )}
                </div>

                {/* placar real */}
                {meu && (meu.placar_real_casa != null || meu.placar_real_fora != null) ? (
                  <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
                    Placar real:{" "}
                    <strong>
                      {meu.placar_real_casa ?? "—"} x {meu.placar_real_fora ?? "—"}
                    </strong>
                  </div>
                ) : null}

                {/* ações */}
                <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button type="button" style={secondaryBtnStyle} onClick={() => togglePalpites(j.id)}>
                    {isOpen ? "Ocultar palpites" : "Ver palpites da liga"}
                  </button>

                  <Link href={`/app/ligas/${ligaId}/palpites`} style={{ textDecoration: "none" }}>
                    <button type="button" style={secondaryBtnStyle}>
                      Ir para meus palpites
                    </button>
                  </Link>
                </div>

                {/* lista de palpites (carrega sob demanda) */}
                {isOpen ? (
                  <div style={{ marginTop: 12 }}>
                    {!lista ? (
                      <p style={{ margin: 0, opacity: 0.8 }}>Carregando palpites...</p>
                    ) : lista.length === 0 ? (
                      <p style={{ margin: 0, opacity: 0.8 }}>Ninguém palpitou ainda.</p>
                    ) : (
                      <div style={{ overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch"  }}>
                        <table style={tableStyle}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Usuário</th>
                              <th style={thStyle}>Palpite</th>
                              <th style={thStyle}>Pontos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lista.map((p, idx) => {
                              const isMe = meu?.time_casa === p.time_casa && meu?.time_fora === p.time_fora && meu?.palpite_casa === p.palpite_casa && meu?.palpite_fora === p.palpite_fora;
                              // ^ sem user_id disponível, só destacamos por heurística leve; se quiser 100%, backend precisa mandar usuario_id.
                              return (
                                <tr key={`${p.usuario_nome}-${idx}`}>
                                  <td style={isMe ? tdStyleMe : tdStyleStrong}>{p.usuario_nome}</td>
                                  <td style={isMe ? tdStyleMe : tdStyle}>
                                    {p.palpite_casa ?? "—"} x {p.palpite_fora ?? "—"}
                                  </td>
                                  <td style={isMe ? tdStyleMe : tdStyle}>{p.pontos ?? "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
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

function getEscudoSrcByTime(time: { escudo_url?: string | null; sigla?: string | null }) {
  // preferir o escudo_url do banco; fallback para pasta local (se você quiser manter)
  if (time.escudo_url) return time.escudo_url;
  if (time.sigla) return `/escudos/${time.sigla.toUpperCase()}.png`; // ajuste conforme seu padrão
  return "/escudos/default.png";
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

const gameCard: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "var(--surface)",
  cursor: "pointer",
  fontWeight: 600,
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  minWidth: 280,
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

const tdStyleMe: React.CSSProperties = {
  ...tdStyle,
  fontWeight: 800,
  background: "#fafafa",
};

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--foreground)",
  outline: "none",
  height: 42, 
};
