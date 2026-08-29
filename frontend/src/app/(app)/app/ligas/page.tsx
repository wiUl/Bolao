"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { listarMinhasLigas, criarLiga, entrarNaLiga } from "@/app/api/ligas";
import { listarTemporadas } from "@/app/api/temporadas";

import { listarCompeticoes } from "@/app/api/competicoes";
import type { Competicao } from "@/app/types/competicao";

import type { Liga } from "@/app/types/liga";
import type { Temporada } from "@/app/types/temporada";

export default function LigasPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [ligas, setLigas] = useState<Liga[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const temporadasOrdenadas = useMemo(() => {
    return [...temporadas].sort((a, b) => b.ano - a.ano);
  }, [temporadas]);

  // filtro por status da temporada (feito no cliente)
  const [filtroStatus, setFiltroStatus] = useState<"" | "ativa" | "encerrada">("");

  const ligasFiltradas = useMemo(() => {
    let resultado = [...ligas];
    if (filtroStatus === "ativa") {
      resultado = resultado.filter((l) => l.temporada_status !== "finalizada");
    } else if (filtroStatus === "encerrada") {
      resultado = resultado.filter((l) => l.temporada_status === "finalizada");
    }
    // ativas primeiro, depois encerradas; dentro de cada grupo por criação desc
    resultado.sort((a, b) => {
      const aEnc = a.temporada_status === "finalizada" ? 1 : 0;
      const bEnc = b.temporada_status === "finalizada" ? 1 : 0;
      if (aEnc !== bEnc) return aEnc - bEnc;
      return new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime();
    });
    return resultado;
  }, [ligas, filtroStatus]);

  // form criar liga
  const [nomeLiga, setNomeLiga] = useState("");

  const [creating, setCreating] = useState(false);

  // form entrar
  const [codigoConvite, setCodigoConvite] = useState("");
  const [joining, setJoining] = useState(false);

  const [competicoes, setCompeticoes] = useState<Competicao[]>([]);

  const [competicaoId, setCompeticaoId] = useState<number | "">("");
  const [temporadaId, setTemporadaId] = useState<number | "">("");

  const [loadingCompeticoes, setLoadingCompeticoes] = useState(false);
  const [loadingTemporadas, setLoadingTemporadas] = useState(false);


  // auto-hide do sucesso (padrão UX)
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    let mounted = true;

    async function loadCompeticoes() {
      setLoadingCompeticoes(true);
      try {
        const lista = await listarCompeticoes();
        if (!mounted) return;
        setCompeticoes(lista);
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoadingCompeticoes(false);
      }
    }

    loadCompeticoes();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadTemporadas() {
      // reset quando não tem competição
      if (competicaoId === "") {
        setTemporadas([]);
        setTemporadaId("");
        return;
      }

      setLoadingTemporadas(true);
      try {
        const lista = await listarTemporadas({ competicao_id: Number(competicaoId) });
        if (!mounted) return;

        setTemporadas(lista);
        setTemporadaId(""); // força o usuário escolher de novo
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoadingTemporadas(false);
      }
    }

    loadTemporadas();

    return () => {
      mounted = false;
    };
  }, [competicaoId]);



  async function carregarTudo() {
    setErr(null);
    setLoading(true);

    try {
      const [temps, minhas] = await Promise.all([
        listarTemporadas(),
        listarMinhasLigas(),
      ]);

      setTemporadas(temps);
      setLigas(minhas);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCriarLiga() {
    setErr(null);
    setMsg(null);

    const nome = nomeLiga.trim();
    if (nome.length < 3) {
      setErr("O nome da liga precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (temporadaId === "") {
      setErr("Selecione uma temporada para criar a liga.");
      return;
    }

    setCreating(true);
    try {
      const liga = await criarLiga({ nome, temporada_id: temporadaId });

      setMsg(`Liga "${liga.nome}" criada com sucesso.`);
      setNomeLiga("");

      // Atualiza lista e já navega pra liga (padrão: ao criar, entrar nela)
      await carregarTudo();
      router.push(`/app/ligas/${liga.id}`);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setCreating(false);
    }
  }

  async function handleEntrarLiga() {
    setErr(null);
    setMsg(null);

    const codigo = codigoConvite.trim();
    if (!codigo) {
      setErr("Informe o código de convite.");
      return;
    }

    setJoining(true);
    try {
      const liga = await entrarNaLiga({ codigo_convite: codigo });

      setMsg(`Você entrou na liga "${liga.nome}".`);
      setCodigoConvite("");

      await carregarTudo();
      router.push(`/app/ligas/${liga.id}`);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setJoining(false);
    }
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <section style={sectionStyle}> 
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ marginTop: 0, fontWeight: 600 }}>Minhas Ligas</h1>
        <Link href="/app" style={{ textDecoration: "none" , fontWeight: 600}}>
          Voltar
        </Link>
      </div>

      <p style={{ marginTop: 0 }}>
        Aqui você vê as ligas que participa, cria novas ligas e entra por convite.
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

      {/* Ações */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Ações</h2>

        <div style={gridStyle}>
          {/* Card: Criar liga */}
          <div style={cardStyle}>
            <strong>Criar liga</strong>

            <label style={labelStyle}>
              <span>Nome</span>
              <input
                value={nomeLiga}
                onChange={(e) => setNomeLiga(e.target.value)}
                placeholder="Ex: Bolão da Firma"
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              <span>Competição</span>
              <select
                value={competicaoId}
                onChange={(e) =>
                  setCompeticaoId(e.target.value ? Number(e.target.value) : "")
                }
                style={inputStyle}
                disabled={loadingCompeticoes}
              >
                <option value="">Selecione</option>
                {competicoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>

            <label style={labelStyle}>
              <span>Temporada</span>
              <select
                value={temporadaId}
                onChange={(e) =>
                  setTemporadaId(e.target.value ? Number(e.target.value) : "")
                }
                style={inputStyle}
                disabled={competicaoId === "" || loadingTemporadas}
              >
                <option value="">
                  {competicaoId === ""
                    ? "Selecione uma competição primeiro"
                    : loadingTemporadas
                    ? "Carregando..."
                    : "Selecione"}
                </option>

                {temporadas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.ano}
                  </option>
                ))}
              </select>
            </label>

            <button
              onClick={handleCriarLiga}
              disabled={creating}
              style={primaryBtnStyle(creating)}
              type="button"
            >
              {creating ? "Criando..." : "Criar"}
            </button>
          </div>

          {/* Card: Entrar por convite */}
          <div style={cardStyle}>
            <strong>Entrar por convite</strong>

            <label style={labelStyle}>
              <span>Código</span>
              <input
                value={codigoConvite}
                onChange={(e) => setCodigoConvite(e.target.value)}
                placeholder="Cole o código de convite"
                style={inputStyle}
              />
            </label>

            <button
              onClick={handleEntrarLiga}
              disabled={joining}
              style={primaryBtnStyle(joining)}
              type="button"
            >
              {joining ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </div>
      </section>


      {/* Lista */}
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Suas ligas</h2>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>Filtrar:</span>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as "" | "ativa" | "encerrada")}
              style={{ ...inputStyle, padding: "8px 10px" }}
            >
              <option value="">Todas</option>
              <option value="ativa">Ativas</option>
              <option value="encerrada">Encerradas</option>
            </select>
          </div>
        </div>

        {loading ? <p>Carregando...</p> : null}

        {!loading && ligasFiltradas.length === 0 ? (
          <p>
            {filtroStatus === "ativa"
              ? "Nenhuma liga ativa encontrada."
              : filtroStatus === "encerrada"
              ? "Nenhuma liga encerrada encontrada."
              : "Você ainda não participa de nenhuma liga."}
          </p>
        ) : null}

        {!loading && ligasFiltradas.length > 0 ? (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {ligasFiltradas.map((liga) => {
              const encerrada = liga.temporada_status === "encerrada";
              return (
                <Link
                  key={liga.id}
                  href={`/app/ligas/${liga.id}`}
                  style={{
                    ...cardStyle,
                    textDecoration: "none",
                    color: "inherit",
                    opacity: encerrada ? 0.75 : 1,
                    borderColor: encerrada ? "#ddd" : "#b7e3c5",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <strong style={{ fontSize: 15 }}>{liga.nome}</strong>
                    <span style={encerrada ? badgeEncerradaStyle : badgeAtivaStyle}>
                      {encerrada ? "Encerrada" : "Ativa"}
                    </span>
                  </div>

                  <span style={{ fontSize: 13, opacity: 0.75 }}>
                    {liga.competicao_nome ?? "Competição"} · {liga.temporada_ano ?? liga.temporada_id}
                  </span>

                  <span style={{ fontSize: 13, opacity: 0.7 }}>
                    Código de convite: <code>{liga.codigo_convite}</code>
                  </span>
                </Link>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}

/** Extrator padrão pro FastAPI (evita "[object Object]") */
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
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

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 10,
};

const actionCardStyle: React.CSSProperties = {
  border: "1px solid #eee",
  borderRadius: 12,
  padding: 16,
};

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: disabled ? "var(--muted)" : "var(--surface)",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 600,
  };
}

const badgeAtivaStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: 20,
  background: "#e8f5e9",
  color: "#2e7d32",
  border: "1px solid #b7e3c5",
  whiteSpace: "nowrap",
};

const badgeEncerradaStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "2px 10px",
  borderRadius: 20,
  background: "#f5f5f5",
  color: "#757575",
  border: "1px solid #ddd",
  whiteSpace: "nowrap",
};