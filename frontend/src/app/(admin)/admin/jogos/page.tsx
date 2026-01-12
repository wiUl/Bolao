"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listarCompeticoes } from "@/app/api/competicoes";
import { listarTemporadas } from "@/app/api/temporadas";
import { listarJogos, atualizarResultadoJogo, atualizarJogo } from "@/app/api/jogos";

import type { Competicao } from "@/app/types/competicao";
import type { Temporada } from "@/app/types/temporada";
import type { Jogo } from "@/app/types/jogo";

type EditRow = {
  gols_casa: string;
  gols_fora: string;
  status: string;

  // ✅ NOVO: campo de data/hora editável no formato BR
  data_hora: string;

  loading?: boolean;
  ok?: string | null;
  err?: string | null;
};

export default function AdminJogosPage() {
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [competicoes, setCompeticoes] = useState<Competicao[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [competicaoId, setCompeticaoId] = useState<number | "">("");
  const [ano, setAno] = useState<number | "">("");
  const [temporadaId, setTemporadaId] = useState<number | "">("");
  const [rodada, setRodada] = useState<number | "">("");

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(false);

  const [edits, setEdits] = useState<Record<number, EditRow>>({});

  function resetAlerts() {
    setErr(null);
    setOk(null);
  }

  const competicaoNomeById = useMemo(() => {
    const m = new Map<number, string>();
    competicoes.forEach((c) => m.set(c.id, c.nome));
    return m;
  }, [competicoes]);

  const anosDisponiveis = useMemo(() => {
    const years = new Set<number>();
    temporadas.forEach((t) => years.add(t.ano));
    return Array.from(years).sort((a, b) => b - a);
  }, [temporadas]);

  const temporadasFiltradasPorAno = useMemo(() => {
    if (!ano) return [];
    return temporadas.filter((t) => t.ano === Number(ano));
  }, [temporadas, ano]);

  useEffect(() => {
    (async () => {
      setLoadingMeta(true);
      resetAlerts();
      try {
        const cs = await listarCompeticoes();
        setCompeticoes(cs);
      } catch (e: any) {
        setErr(extractApiErrorMessage(e));
      } finally {
        setLoadingMeta(false);
      }
    })();
  }, []);

  // quando muda competição, carrega temporadas dessa competição e reseta filtros dependentes
  useEffect(() => {
    (async () => {
      if (!competicaoId) {
        setTemporadas([]);
        setAno("");
        setTemporadaId("");
        setRodada("");
        setJogos([]);
        setEdits({});
        return;
      }

      resetAlerts();
      try {
        const ts = await listarTemporadas({ competicao_id: Number(competicaoId) });
        setTemporadas(ts);

        // reseta dependências
        setAno("");
        setTemporadaId("");
        setRodada("");
        setJogos([]);
        setEdits({});
      } catch (e: any) {
        setErr(extractApiErrorMessage(e));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competicaoId]);

  // quando muda ano, tenta escolher automaticamente se tiver só 1 temporada
  useEffect(() => {
    if (!ano) {
      setTemporadaId("");
      setJogos([]);
      setEdits({});
      return;
    }
    const list = temporadas.filter((t) => t.ano === Number(ano));
    if (list.length === 1) {
      setTemporadaId(list[0].id);
    } else {
      setTemporadaId("");
    }
    setRodada("");
    setJogos([]);
    setEdits({});
  }, [ano, temporadas]);

  async function handleCarregarJogos() {
    resetAlerts();

    if (!competicaoId) {
      setErr("Selecione uma competição.");
      return;
    }
    if (!ano) {
      setErr("Selecione um ano.");
      return;
    }
    if (!temporadaId) {
      setErr("Selecione uma temporada.");
      return;
    }

    setLoadingJogos(true);
    try {
      const params: any = { temporada_id: Number(temporadaId) };
      if (rodada !== "") params.rodada = Number(rodada);

      const data = await listarJogos(params);
      setJogos(data);

      const initialEdits: Record<number, EditRow> = {};
      data.forEach((j) => {
        initialEdits[j.id] = {
          gols_casa: j.gols_casa === null ? "" : String(j.gols_casa),
          gols_fora: j.gols_fora === null ? "" : String(j.gols_fora),
          status: j.status ?? "",
          // ✅ NOVO: preenche input com a data atual (formatada BR) se existir
          data_hora: j.data_hora ? formatIsoToBR(j.data_hora) : "",
          ok: null,
          err: null,
        };
      });
      setEdits(initialEdits);

      setOk(`Carregados ${data.length} jogo(s).`);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoadingJogos(false);
    }
  }

  async function handleSalvarResultado(jogo: Jogo) {
    resetAlerts();

    const row = edits[jogo.id];
    if (!row) return;

    const golsCasaNum = Number(row.gols_casa);
    const golsForaNum = Number(row.gols_fora);

    if (row.gols_casa.trim() === "" || row.gols_fora.trim() === "") {
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: { ...prev[jogo.id], err: "Informe gols casa e gols fora.", ok: null },
      }));
      return;
    }

    if (!Number.isFinite(golsCasaNum) || !Number.isFinite(golsForaNum) || golsCasaNum < 0 || golsForaNum < 0) {
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: { ...prev[jogo.id], err: "Gols inválidos.", ok: null },
      }));
      return;
    }

    setEdits((prev) => ({
      ...prev,
      [jogo.id]: { ...prev[jogo.id], loading: true, err: null, ok: null },
    }));

    try {
      const updated = await atualizarResultadoJogo(jogo.id, {
        gols_casa: golsCasaNum,
        gols_fora: golsForaNum,
        status: row.status?.trim() ? row.status.trim() : "finalizado",
      });

      // atualiza lista
      setJogos((prev) => prev.map((x) => (x.id === jogo.id ? updated : x)));

      // marca ok na linha
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: {
          ...prev[jogo.id],
          loading: false,
          ok: "Salvo!",
          err: null,
          gols_casa: updated.gols_casa === null ? "" : String(updated.gols_casa),
          gols_fora: updated.gols_fora === null ? "" : String(updated.gols_fora),
          status: updated.status ?? prev[jogo.id].status,
          // mantém o que já estava no input de data/hora
          data_hora: prev[jogo.id].data_hora,
        },
      }));
    } catch (e: any) {
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: { ...prev[jogo.id], loading: false, err: extractApiErrorMessage(e), ok: null },
      }));
    }
  }

  // ✅ NOVO: salvar somente data/hora via atualizarJogo
  async function handleSalvarDataHora(jogo: Jogo) {
    resetAlerts();

    const row = edits[jogo.id];
    if (!row) return;

    const parsed = parseBRDateTimeToISO(row.data_hora);
    if (!parsed.ok) {
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: { ...prev[jogo.id], err: parsed.error, ok: null },
      }));
      return;
    }

    setEdits((prev) => ({
      ...prev,
      [jogo.id]: { ...prev[jogo.id], loading: true, err: null, ok: null },
    }));

    try {
      // envia somente os campos relevantes (data_hora e opcionalmente status)
      const updated = await atualizarJogo(jogo.id, {
        data_hora: parsed.iso,
        status: row.status?.trim() ? row.status.trim() : undefined,
      });

      // atualiza lista (para mostrar a data atualizada)
      setJogos((prev) => prev.map((x) => (x.id === jogo.id ? updated : x)));

      // marca ok na linha e atualiza o input com o retorno do backend (formatado BR)
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: {
          ...prev[jogo.id],
          loading: false,
          ok: "Data/Hora salva!",
          err: null,
          data_hora: updated.data_hora ? formatIsoToBR(updated.data_hora) : prev[jogo.id].data_hora,
          status: updated.status ?? prev[jogo.id].status,
        },
      }));
    } catch (e: any) {
      setEdits((prev) => ({
        ...prev,
        [jogo.id]: { ...prev[jogo.id], loading: false, err: extractApiErrorMessage(e), ok: null },
      }));
    }
  }

  const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 1100, margin: "0 auto" };

  const sectionStyle: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 12,
    padding: 16,
    marginTop: 18,
  };

  const rowStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 12,
    alignItems: "end",
  };

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    fontSize: 14,
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    outline: "none",
    height: 42,
  };

  function btnStyle(kind: "primary" | "ghost" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 700,
    height: 42,
    background: "white",

    // ✅ correções
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
    lineHeight: 1,
    textAlign: "center",
  };
  if (kind === "danger") return { ...base, borderColor: "#f3c2c2" };
  if (kind === "ghost") return { ...base, background: "transparent" };
  return { ...base };
}


  function alertStyle(kind: "success" | "error" | "warn"): React.CSSProperties {
    const base: React.CSSProperties = {
      border: "1px solid #ddd",
      borderRadius: 10,
      padding: 12,
      marginTop: 12,
      marginBottom: 12,
    };
    if (kind === "success") return { ...base, borderColor: "#b7e3c5" };
    if (kind === "error") return { ...base, borderColor: "#f3c2c2" };
    return { ...base, borderColor: "#f2ddb0" };
  }

  return (
    <main style={pageStyle}>
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h1 style={{ marginTop: 0, marginBottom: 0, fontWeight: 600 }}>
            Admin · Jogos
          </h1>

          <Link href="/app" style={{ textDecoration: "none", fontWeight: 600 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.9 }}>
          Filtre por competição/ano/rodada e atualize o placar real (gols e status e data/hora).
        </p>
      </section>

      {!!ok && <div style={alertStyle("success")}>{ok}</div>}
      {!!err && <div style={alertStyle("error")}>{err}</div>}

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Filtros</h2>

        {loadingMeta ? (
          <p>Carregando...</p>
        ) : (
          <>
            <div style={rowStyle}>
              <label style={fieldStyle}>
                <span>Competição</span>
                <select
                  style={inputStyle}
                  value={competicaoId}
                  onChange={(e) => setCompeticaoId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Selecione</option>
                  {competicoes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span>Ano</span>
                <select
                  style={inputStyle}
                  value={ano}
                  onChange={(e) => setAno(e.target.value ? Number(e.target.value) : "")}
                  disabled={!competicaoId || anosDisponiveis.length === 0}
                >
                  <option value="">{competicaoId ? "Selecione" : "Escolha a competição"}</option>
                  {anosDisponiveis.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span>Temporada</span>
                <select
                  style={inputStyle}
                  value={temporadaId}
                  onChange={(e) => setTemporadaId(e.target.value ? Number(e.target.value) : "")}
                  disabled={!ano}
                >
                  <option value="">{ano ? "Selecione" : "Escolha o ano"}</option>
                  {temporadasFiltradasPorAno.map((t) => (
                    <option key={t.id} value={t.id}>
                      #{t.id} · {competicaoNomeById.get(t.competicao_id) ?? `Comp#${t.competicao_id}`} · {t.ano} ·{" "}
                      {t.status}
                    </option>
                  ))}
                </select>
              </label>

              <label style={fieldStyle}>
                <span>Rodada (opcional)</span>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="Ex: 1"
                  value={rodada}
                  onChange={(e) => setRodada(e.target.value ? Number(e.target.value) : "")}
                  disabled={!temporadaId}
                />
              </label>

              <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                <button
                  style={btnStyle("primary")}
                  onClick={handleCarregarJogos}
                  disabled={loadingJogos || !temporadaId}
                >
                  {loadingJogos ? "Carregando..." : "Carregar jogos"}
                </button>

                <button
                  style={btnStyle("ghost")}
                  onClick={() => {
                    setJogos([]);
                    setEdits({});
                    resetAlerts();
                  }}
                  disabled={loadingJogos}
                >
                  Limpar lista
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Jogos</h2>
          {loadingJogos ? <span style={{ fontSize: 14, opacity: 0.8 }}>Carregando...</span> : null}
        </div>

        {!loadingJogos && jogos.length === 0 ? <p>Nenhum jogo encontrado para esse filtro.</p> : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {jogos.map((j) => {
            const row = edits[j.id] ?? {
              gols_casa: j.gols_casa == null ? "" : String(j.gols_casa),
              gols_fora: j.gols_fora == null ? "" : String(j.gols_fora),
              status: j.status ?? "agendado",
              data_hora: j.data_hora ? formatIsoToBR(j.data_hora) : "",
              loading: false,
              ok: null,
              err: null,
            };

            const finalizado = isFinalizado(row.status);
            const disabled = finalizado || !!row.loading;

            return (
              <div
                key={j.id}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 12,
                  padding: 14,
                  background: "white",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>
                      {j.time_casa.nome} x {j.time_fora.nome}
                    </strong>

                    <div style={{ fontSize: 14, opacity: 0.85, marginTop: 4 }}>
                      ID: <code>{j.id}</code> • Rodada: <code>{j.rodada}</code> •{" "}
                      Status: <code>{row.status}</code>
                    </div>

                    {j.data_hora ? (
                      <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>
                        Data/Hora: <code>{formatIsoToBR(j.data_hora)}</code>
                      </div>
                    ) : null}
                  </div>

                  {finalizado ? (
                    <div style={{ fontSize: 14, opacity: 0.9 }}>
                      Resultado final:{" "}
                      <strong>
                        {row.gols_casa || "—"} x {row.gols_fora || "—"}
                      </strong>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <strong style={{ width: 42 }}>{j.time_casa.sigla ?? ""}</strong>
                    <img
                      src={getEscudoSrcByTime(j.time_casa)}
                      alt={`Escudo ${j.time_casa.nome}`}
                      style={{ width: 28, height: 28, objectFit: "contain" }}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={row.gols_casa}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [j.id]: { ...prev[j.id], gols_casa: e.target.value, ok: null, err: null },
                      }))
                    }
                    style={{ ...inputStyle, width: 80, textAlign: "center" }}
                    disabled={disabled}
                    placeholder="Casa"
                  />

                  <span style={{ fontWeight: 800 }}>x</span>

                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={row.gols_fora}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [j.id]: { ...prev[j.id], gols_fora: e.target.value, ok: null, err: null },
                      }))
                    }
                    style={{ ...inputStyle, width: 80, textAlign: "center" }}
                    disabled={disabled}
                    placeholder="Fora"
                  />

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <img
                      src={getEscudoSrcByTime(j.time_fora)}
                      alt={`Escudo ${j.time_fora.nome}`}
                      style={{ width: 28, height: 28, objectFit: "contain" }}
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                    <strong style={{ width: 42, textAlign: "right" }}>{j.time_fora.sigla ?? ""}</strong>
                  </div>

                  {/* Status: só 3 opções */}
                  <select
                    value={row.status}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [j.id]: { ...prev[j.id], status: e.target.value, ok: null, err: null },
                      }))
                    }
                    style={{ ...inputStyle, height: 42, minWidth: 180 }}
                    disabled={row.loading}
                  >
                    <option value="agendado">agendado</option>
                    <option value="em_andamento">em_andamento</option>
                    <option value="finalizado">finalizado</option>
                  </select>

                  {/* ✅ NOVO: input para editar data/hora em formato BR */}
                  <input
                    type="text"
                    value={row.data_hora}
                    onChange={(e) =>
                      setEdits((prev) => ({
                        ...prev,
                        [j.id]: { ...prev[j.id], data_hora: e.target.value, ok: null, err: null },
                      }))
                    }
                    style={{ ...inputStyle, minWidth: 220 }}
                    disabled={row.loading}
                    placeholder="Ex: 11/01/2018 16h00"
                    title="Formato: dd/MM/aaaa HHhmm (ex: 11/01/2018 16h00) ou dd/MM/aaaa HH:mm"
                  />

                  <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
                    {/* ✅ NOVO: salvar apenas data/hora */}
                    <button
                      type="button"
                      onClick={() => handleSalvarDataHora(j)}
                      style={primaryBtnStyle(!!row.loading)}
                      disabled={!!row.loading}
                      title="Salvar data/hora do jogo"
                    >
                      {row.loading ? "Salvando..." : "Salvar data/hora"}
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        // validação mínima
                        const gc = toIntOrNull(row.gols_casa);
                        const gf = toIntOrNull(row.gols_fora);

                        if (gc == null || gf == null) {
                          setEdits((prev) => ({
                            ...prev,
                            [j.id]: { ...prev[j.id], err: "Informe gols casa e gols fora.", ok: null },
                          }));
                          return;
                        }

                        // salva
                        setEdits((prev) => ({
                          ...prev,
                          [j.id]: { ...prev[j.id], loading: true, err: null, ok: null },
                        }));

                        try {
                          const updated = await atualizarResultadoJogo(j.id, {
                            gols_casa: gc,
                            gols_fora: gf,
                            status: row.status || "finalizado",
                          });

                          setJogos((prev) => prev.map((x) => (x.id === j.id ? updated : x)));
                          setEdits((prev) => ({
                            ...prev,
                            [j.id]: {
                              ...prev[j.id],
                              loading: false,
                              ok: "Salvo!",
                              err: null,
                              gols_casa: updated.gols_casa == null ? "" : String(updated.gols_casa),
                              gols_fora: updated.gols_fora == null ? "" : String(updated.gols_fora),
                              status: updated.status ?? prev[j.id].status,
                              data_hora: prev[j.id].data_hora,
                            },
                          }));
                        } catch (e: any) {
                          setEdits((prev) => ({
                            ...prev,
                            [j.id]: { ...prev[j.id], loading: false, err: extractApiErrorMessage(e), ok: null },
                          }));
                        }
                      }}
                      style={primaryBtnStyle(!!row.loading)}
                      disabled={disabled}
                      title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
                    >
                      {row.loading ? "Salvando..." : "Salvar resultado"}
                    </button>

                    {/* opcional: limpar resultado (sem deletar o jogo) */}
                    <button
                      type="button"
                      onClick={() =>
                        setEdits((prev) => ({
                          ...prev,
                          [j.id]: { ...prev[j.id], gols_casa: "", gols_fora: "", ok: null, err: null },
                        }))
                      }
                      style={dangerBtnStyle}
                      disabled={disabled}
                      title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {row.ok ? <div style={{ marginTop: 10, fontSize: 14, color: "#1f7a3f" }}>{row.ok}</div> : null}
                {row.err ? <div style={{ marginTop: 10, fontSize: 14, color: "#b42318" }}>{row.err}</div> : null}
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

// helpers (coloque no mesmo arquivo da página)
function isFinalizado(status?: string | null) {
  return status === "finalizado";
}

function getEscudoSrcByTime(time: { escudo_url?: string | null; sigla?: string | null }) {
  // preferir o escudo_url do banco; fallback para pasta local (se você quiser manter)
  if (time.escudo_url) return time.escudo_url;
  if (time.sigla) return `/escudos/${time.sigla.toLowerCase()}.png`; // ajuste conforme seu padrão
  return "/escudos/default.png";
}

function toIntOrNull(v: string) {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: disabled ? "#f5f5f5" : "white",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}


const dangerBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #f3c2c2",
  background: "white",
  cursor: "pointer",
  fontWeight: 600,
};

/**
 * ✅ Exibe ISO no formato BR (São Paulo)
 * Retorna: "dd/MM/aaaa HHhmm"
 */
function formatIsoToBR(iso: string): string {
  const d = new Date(iso);

  const parts = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const dd = get("day");
  const mm = get("month");
  const yyyy = get("year");
  const HH = get("hour");
  const Min = get("minute");

  return `${dd}/${mm}/${yyyy} ${HH}h${Min}`;
}

/**
 * ✅ Aceita:
 *  - "11/01/2018 16h00"
 *  - "11/01/2018 16:00"
 * e converte para ISO com offset Brasil:
 *  - "2018-01-11T16:00:00-03:00"
 */
function parseBRDateTimeToISO(
  input: string
): { ok: true; iso: string } | { ok: false; error: string } {
  const raw = (input ?? "").trim();
  if (!raw) return { ok: false, error: "Informe a data/hora. Ex: 11/01/2018 16h00" };

  const normalized = raw.replace(/\s+/g, " ").replace("H", "h").replace(":", "h");

  const m = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2})h(\d{1,2})$/);
  if (!m) {
    return { ok: false, error: "Formato inválido. Use: dd/MM/aaaa HHhmm (ex: 11/01/2018 16h00) ou HH:mm" };
  }

  const dd = Number(m[1]);
  const MM = Number(m[2]);
  const yyyy = Number(m[3]);
  const HH = Number(m[4]);
  const min = Number(m[5]);

  if (MM < 1 || MM > 12) return { ok: false, error: "Mês inválido." };
  if (dd < 1 || dd > 31) return { ok: false, error: "Dia inválido." };
  if (HH < 0 || HH > 23) return { ok: false, error: "Hora inválida." };
  if (min < 0 || min > 59) return { ok: false, error: "Minutos inválidos." };

  // valida data real (ex: 31/02)
  const test = new Date(Date.UTC(yyyy, MM - 1, dd, 12, 0, 0));
  if (test.getUTCFullYear() !== yyyy || test.getUTCMonth() !== MM - 1 || test.getUTCDate() !== dd) {
    return { ok: false, error: "Data inválida." };
  }

  const ddStr = String(dd).padStart(2, "0");
  const MMStr = String(MM).padStart(2, "0");
  const HHStr = String(HH).padStart(2, "0");
  const minStr = String(min).padStart(2, "0");

  // Offset Brasil (São Paulo): -03:00
  const iso = `${yyyy}-${MMStr}-${ddStr}T${HHStr}:${minStr}:00-03:00`;
  return { ok: true, iso };
}
