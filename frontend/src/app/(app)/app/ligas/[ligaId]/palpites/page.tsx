"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { listarMinhasLigas } from "@/app/api/ligas";
import { listarJogos } from "@/app/api/jogos";
import { listarMeusPalpitesNaRodada, upsertMeuPalpite, deletarMeuPalpite } from "@/app/api/palpites";

import type { Liga } from "@/app/types/liga";
import type { Jogo } from "@/app/types/jogo";
import type { MeuPalpiteRodadaItem } from "@/app/types/palpite";
import { formatDateTimeSP } from "@/app/utils/datetime";


type FormState = {
  palpite_casa: string; // string pra controlar input
  palpite_fora: string;
  saving?: boolean;
};

export default function PalpitesRodadaPage() {
  const params = useParams();
  const ligaId = Number(params?.ligaId);

  const [liga, setLiga] = useState<Liga | null>(null);

  const [rodada, setRodada] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [meusPalpites, setMeusPalpites] = useState<MeuPalpiteRodadaItem[]>([]);
  const meusPalpitesMap = useMemo(() => {
    const m = new Map<number, MeuPalpiteRodadaItem>();
    for (const p of meusPalpites) m.set(p.jogo_id, p);
    return m;
  }, [meusPalpites]);

  // estado dos inputs por jogo
  const [forms, setForms] = useState<Record<number, FormState>>({});

  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth <= 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // auto-hide de sucesso
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  // 1) Carrega a liga (pra pegar temporada_id)
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

  // 2) Carrega jogos + meus palpites quando (liga + rodada) estiverem prontos
  useEffect(() => {
    if (!liga) return;

    const ligaAtual = liga; 

    let mounted = true;

    async function loadRodada() {
      setErr(null);
      setMsg(null);
      setLoading(true);

      try {
        const [listaJogos, listaPalpites] = await Promise.all([
          listarJogos({ temporada_id: ligaAtual.temporada_id, rodada }),
          listarMeusPalpitesNaRodada(ligaAtual.id, rodada),
        ]);

        if (!mounted) return;

        setJogos(listaJogos);
        setMeusPalpites(listaPalpites);

        // Inicializa inputs com os palpites existentes
        const nextForms: Record<number, FormState> = {};
        for (const j of listaJogos) {
          const p = listaPalpites.find((x) => x.jogo_id === j.id);
          nextForms[j.id] = {
            palpite_casa: p?.palpite_casa != null ? String(p.palpite_casa) : "",
            palpite_fora: p?.palpite_fora != null ? String(p.palpite_fora) : "",
          };
        }
        setForms(nextForms);
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

  function setFormValue(jogoId: number, key: "palpite_casa" | "palpite_fora", value: string) {
    setForms((prev) => ({
      ...prev,
      [jogoId]: { ...(prev[jogoId] ?? { palpite_casa: "", palpite_fora: "" }), [key]: value },
    }));
  }

  function isFinalizado(status: string) {
    const s = (status || "").toLowerCase();
    return s.includes("final") || s.includes("encerr") || s === "finalizado";
  }

  async function handleSalvar(jogoId: number) {
    setErr(null);
    setMsg(null);

    const f = forms[jogoId];
    if (!f) return;

    const casaStr = f.palpite_casa.trim();
    const foraStr = f.palpite_fora.trim();

    if (casaStr === "" || foraStr === "") {
      setErr("Preencha os dois placares para salvar o palpite.");
      return;
    }

    const casa = Number(casaStr);
    const fora = Number(foraStr);

    if (!Number.isInteger(casa) || !Number.isInteger(fora)) {
      setErr("Os placares precisam ser números inteiros.");
      return;
    }
    if (casa < 0 || fora < 0 || casa > 20 || fora > 20) {
      setErr("Placares devem estar entre 0 e 20.");
      return;
    }

    // marca saving só daquele jogo
    setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: true } }));

    try {
      await upsertMeuPalpite(ligaId, jogoId, { placar_casa: casa, placar_fora: fora });
      setMsg("Palpite salvo.");

      // Recarrega apenas os palpites da rodada (mais leve que recarregar jogos também)
      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: false } }));
    }
  }

  async function handleDeletar(jogoId: number) {
    setErr(null);
    setMsg(null);

    // confirmação simples (padrão)
    const ok = window.confirm("Deseja remover seu palpite deste jogo?");
    if (!ok) return;

    setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: true } }));

    try {
      await deletarMeuPalpite(ligaId, jogoId);
      setMsg("Palpite removido.");

      // limpa inputs e recarrega palpites
      setForms((prev) => ({
        ...prev,
        [jogoId]: { ...(prev[jogoId] ?? { palpite_casa: "", palpite_fora: "" }), palpite_casa: "", palpite_fora: "", saving: false },
      }));

      const lista = await listarMeusPalpitesNaRodada(ligaId, rodada);
      setMeusPalpites(lista);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
      setForms((prev) => ({ ...prev, [jogoId]: { ...prev[jogoId], saving: false } }));
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      {/* Header em card */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ marginTop: 0, marginBottom: 0 , fontWeight: 600}}>
            Palpites — Rodada {rodada}
          </h1>

          <div style={{ display: "flex", gap: 12 }}>
            <Link href={`/app/ligas/${ligaId}`} style={{ textDecoration: "none", fontWeight: 600 }}>
              Voltar
            </Link>
          </div>
        </div>

        <p style={{ marginTop: 8, marginBottom: 0 }}>
          {liga ? (
            <>
              Liga: <strong>{liga.nome}</strong> — Temporada #{liga.temporada_id}
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

      {msg ? (
        <div style={alertStyle("success")} role="status" aria-live="polite">
          <strong>Ok:</strong> {msg}
        </div>
      ) : null}

      {/* Seletor de rodada */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Rodada</h2>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            style={secondaryBtnStyle}
            onClick={() => setRodada((r) => Math.max(1, r - 1))}
            disabled={rodada <= 1 || loading}
          >
            ← Anterior
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Número:</span>
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
      </section>

      {/* Lista de jogos */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h2 style={{ marginTop: 0 , fontWeight: 600}}>Jogos</h2>
          {loading ? <span style={{ fontSize: 14, opacity: 0.8 }}>Carregando...</span> : null}
        </div>

        {!loading && jogos.length === 0 ? (
          <p>Nenhum jogo encontrado para essa rodada.</p>
        ) : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {jogos.map((j) => {
            const f = forms[j.id] ?? { palpite_casa: "", palpite_fora: "" };
            const p = meusPalpitesMap.get(j.id) ?? null;

            const finalizado = isFinalizado(j.status);
            const disabled = finalizado || !!f.saving;

            return (
              <div key={j.id} style={gameCard}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>
                      {j.time_casa.nome} x {j.time_fora.nome}
                    </strong>
                    <div style={{ fontSize: 14, opacity: 0.85 }}>
                      {formatDateTimeSP(j.data_hora)} • Status: <code>{j.status}</code>
                    </div>
                  </div>

                  {p?.pontos != null ? (
                    <div style={{ fontSize: 14 }}>
                      Pontos: <strong>{p.pontos}</strong>
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
<div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
  {mobile ? (
    <div style={{ display: "grid", gap: 12, width: "100%" }}>
      {/* Placar em 2 colunas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, width: "100%" }}>
        {/* CASA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img
              src={getEscudoSrc(j.time_casa.sigla)}
              alt={`Escudo ${j.time_casa.nome}`}
              style={{ width: 28, height: 28, objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <strong>{j.time_casa.sigla}</strong>
          </div>

          <input
            type="number"
            min={0}
            max={20}
            value={f.palpite_casa}
            onChange={(e) => setFormValue(j.id, "palpite_casa", e.target.value)}
            style={{ ...inputStyle, width: "100%", textAlign: "center" }}
            disabled={disabled}
            placeholder="Casa"
          />
        </div>

        {/* FORA */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <strong>{j.time_fora.sigla}</strong>
            <img
              src={getEscudoSrc(j.time_fora.sigla)}
              alt={`Escudo ${j.time_fora.nome}`}
              style={{ width: 28, height: 28, objectFit: "contain" }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>

          <input
            type="number"
            min={0}
            max={20}
            value={f.palpite_fora}
            onChange={(e) => setFormValue(j.id, "palpite_fora", e.target.value)}
            style={{ ...inputStyle, width: "100%", textAlign: "center" }}
            disabled={disabled}
            placeholder="Fora"
          />
        </div>
      </div>

      {/* Botões em linha abaixo, ocupando 100% */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
        <button
          type="button"
          onClick={() => handleSalvar(j.id)}
          style={primaryBtnStyle(!!f.saving)}
          disabled={disabled}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          {f.saving ? "Salvando..." : "Salvar"}
        </button>

        <button
          type="button"
          onClick={() => handleDeletar(j.id)}
          style={dangerBtnStyle}
          disabled={disabled || (p?.palpite_casa == null && p?.palpite_fora == null)}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          Remover
        </button>
      </div>
    </div>
  ) : (
    // ✅ Desktop: mantém seu layout original exatamente como estava
    <div style={scoreRowStyle}>
      {/* Casa: SIGLA + escudo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <strong style={{ width: 42 }}>{j.time_casa.sigla}</strong>

        <img
          src={getEscudoSrc(j.time_casa.sigla)}
          alt={`Escudo ${j.time_casa.nome}`}
          style={{ width: 28, height: 28, objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      </div>

      {/* Inputs placar */}
      <input
        type="number"
        min={0}
        max={20}
        value={f.palpite_casa}
        onChange={(e) => setFormValue(j.id, "palpite_casa", e.target.value)}
        style={{ ...inputStyle, width: 80, textAlign: "center" }}
        disabled={disabled}
      />

      <span style={{ fontWeight: 800 }}>x</span>

      <input
        type="number"
        min={0}
        max={20}
        value={f.palpite_fora}
        onChange={(e) => setFormValue(j.id, "palpite_fora", e.target.value)}
        style={{ ...inputStyle, width: 80, textAlign: "center" }}
        disabled={disabled}
      />

      {/* Fora: escudo + SIGLA */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src={getEscudoSrc(j.time_fora.sigla)}
          alt={`Escudo ${j.time_fora.nome}`}
          style={{ width: 28, height: 28, objectFit: "contain" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        <strong style={{ width: 42, textAlign: "right" }}>{j.time_fora.sigla}</strong>
      </div>

      {/* Botões */}
      <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => handleSalvar(j.id)}
          style={primaryBtnStyle(!!f.saving)}
          disabled={disabled}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          {f.saving ? "Salvando..." : "Salvar"}
        </button>

        <button
          type="button"
          onClick={() => handleDeletar(j.id)}
          style={dangerBtnStyle}
          disabled={disabled || (p?.palpite_casa == null && p?.palpite_fora == null)}
          title={finalizado ? "Jogo finalizado (edição bloqueada)" : ""}
        >
          Remover
        </button>
      </div>
    </div>
  )}
</div>

                </div>

                {p && (p.placar_real_casa != null || p.placar_real_fora != null) ? (
                  <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
                    Placar real:{" "}
                    <strong>
                      {p.placar_real_casa ?? "—"} x {p.placar_real_fora ?? "—"}
                    </strong>
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



function alertStyle(kind: "success" | "error"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  };
  return kind === "success"
    ? { ...base, borderColor: "#b7e3c5" }
    : { ...base, borderColor: "#f3c2c2" };
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
  display: "flex",
  flexDirection: "column",
};

const miniLabel: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
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


function getEscudoSrc(sigla: string | null | undefined): string {
  if (!sigla) return "/escudos/default.png";
  return `/escudos/${sigla.toUpperCase()}.png`;
}



const logoStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 999,
  objectFit: "contain",
  border: "1px solid #eee",
};

const scoreRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 12,
};
