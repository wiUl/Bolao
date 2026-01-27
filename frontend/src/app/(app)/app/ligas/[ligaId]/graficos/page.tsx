"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { listarMinhasLigas } from "@/app/api/ligas";
import {getPontuacaoAcumuladaUsuario,getPontuacaoAcumuladaTodos} from "@/app/api/pontuacao";
import type { SerieLigaResponse } from "@/app/api/pontuacao";
import { listarJogos } from "@/app/api/jogos";
import { useAuth } from "@/app/auth/AuthContext";

import { getRankingGeral } from "@/app/api/ranking";
import type { Liga } from "@/app/types/liga";
import type { PontuacaoAcumuladaItem } from "@/app/types/pontuacao";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

/**
 * Resposta "series" do backend (1 request, pronto pro gráfico).
 * Ex:
 * {
 *   max_rodada: 38,
 *   series: [
 *     { nome: "Willian", data: [0,3,6,...] },
 *     { nome: "Gabriel", data: [0,1,4,...] }
 *   ]
 * }
 */


export default function GraficosPage() {
  const params = useParams();
  const ligaId = Number((params)?.ligaId);

  const { user } = useAuth();

  const [liga, setLiga] = useState<Liga | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rodadaMaxFinalizada, setRodadaMaxFinalizada] = useState<number>(0);
  const [rodadaMaxExistente, setRodadaMaxExistente] = useState<number>(0);
  const [rodadaAteUser, setRodadaAteUser] = useState<number | null>(null);
  const [rodadaAteLiga, setRodadaAteLiga] = useState<number | null>(null);

  // Minha série (flat)
  const [serie, setSerie] = useState<PontuacaoAcumuladaItem[]>([]);

  // Série da liga (pronto pro gráfico)
  const [serieLiga, setSerieLiga] = useState<SerieLigaResponse | null>(null);

  const [pizzaData, setPizzaData] = useState<
    { name: string; value: number; percent: number }[]
  >([]);
  const [loadingPizza, setLoadingPizza] = useState(false);

  // 1) Carrega liga (pra mostrar nome no header)
  useEffect(() => {
    let mounted = true;

    async function loadLiga() {
      setErr(null);
      setLoading(true);

      try {
        if (!Number.isFinite(ligaId)) {
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

  /**
   * 2) Descobre rodadas (existente/finalizada/default)
   *
   * Ideal: trocar o cálculo abaixo por 1 endpoint no backend (ex.: /temporadas/{id}/rodadas/info).
   * Como você pediu só o arquivo, mantive a função mas deixei mais eficiente:
   * - Em vez de "rodada por rodada" sequencial até 60, fazemos em batches paralelos com limite.
   * - Ainda depende do endpoint /jogos por rodada, mas reduz bastante o tempo.
   */
  useEffect(() => {
    if (!liga) return;
    const temporadaId = liga.temporada_id;

    let mounted = true;

    async function loadRodadas() {
      setErr(null);
      setLoading(true);

      try {
        const info = await calcularInfoRodadasRapido(temporadaId);
        if (!mounted) return;

        setRodadaMaxExistente(info.ultimaRodadaExistente);
        setRodadaMaxFinalizada(info.ultimaRodadaFinalizada);
        setRodadaAteUser(info.defaultRodada);
        setRodadaAteLiga(info.defaultRodada);
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    loadRodadas();
    return () => {
      mounted = false;
    };
  }, [liga]);

  // 3) Carrega pontuação acumulada do usuário logado (1 request)
  useEffect(() => {
    if (!liga) return;
    if (!user?.nome) return;

    // se for null, deixa o backend decidir (última rodada finalizada)
    const _ligaId = liga.id;
    const _usuarioNome = user.nome;
    const _rodada = rodadaAteUser ?? undefined;

    let mounted = true;

    async function loadSerie() {
      setErr(null);
      setLoading(true);

      try {
        const data = await getPontuacaoAcumuladaUsuario(_ligaId, _usuarioNome, _rodada as any);
        if (!mounted) return;

        const sorted = [...data].sort((a, b) => a.rodada - b.rodada);
        setSerie(sorted);
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    loadSerie();
    return () => {
      mounted = false;
    };
  }, [liga, user, rodadaAteUser]);

  // 4) Carrega série comparativa da liga (1 request, format=series)
  useEffect(() => {
    if (!liga) return;

    const _ligaId = liga.id;
    const _rodada = rodadaAteLiga ?? undefined;

    let mounted = true;

    async function loadSerieLiga() {
      try {
        if (!_rodada) return;
        const data = await getPontuacaoAcumuladaTodos(_ligaId, _rodada, "series");

        if (!mounted) return;
        setSerieLiga(data);
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      }
    }

    loadSerieLiga();
    return () => {
      mounted = false;
    };
  }, [liga, rodadaAteLiga]);

  // 5) Pizza via ranking (1 request)
  useEffect(() => {
    if (!liga) return;
    if (!user?.nome) return;

    const _ligaId = liga.id;
    const _nome = user.nome;

    let mounted = true;

    async function loadPizzaFromRanking() {
      setLoadingPizza(true);
      try {
        const ranking = await getRankingGeral(_ligaId);

        const eu =
          ranking.find((x: any) => x.nome === _nome) ??
          ranking.find((x: any) =>
            String(x.nome || "").toLowerCase().includes(_nome.toLowerCase())
          );

        if (!eu) {
          if (!mounted) return;
          setPizzaData([]);
          return;
        }

        const placar = eu.acertos_placar ?? 0;
        const saldo = eu.acertos_saldo ?? 0;
        const resultado = eu.acertos_resultado ?? 0;
        const erros = eu.erros ?? 0;

        const total = placar + saldo + resultado + erros;

        const make = (name: string, value: number) => ({
          name,
          value,
          percent: total > 0 ? Math.round((value / total) * 100) : 0,
        });

        const data = [
          make("Placar", placar),
          make("Saldo", saldo),
          make("Resultado", resultado),
          make("Erros", erros),
        ];

        if (!mounted) return;
        setPizzaData(data);
      } catch (e: any) {
        if (!mounted) return;
        setErr(extractApiErrorMessage(e));
      } finally {
        if (!mounted) return;
        setLoadingPizza(false);
      }
    }

    loadPizzaFromRanking();
    return () => {
      mounted = false;
    };
  }, [liga, user]);

  // ====== Memos ======

  const maxPontos = useMemo(() => {
    if (serie.length === 0) return 0;
    return Math.max(...serie.map((x) => x.pontuacao_acumulada));
  }, [serie]);

  // Converte series -> chartData + usuarios
  const ligaChart = useMemo(() => {
    if (!serieLiga || !serieLiga.series || serieLiga.series.length === 0) {
      return { chartData: [] , usuarios: [] as string[] };
    }

    const usuarios = [...serieLiga.series]
      .map((s) => s.nome)
      .sort((a, b) => a.localeCompare(b));

    // para manter a mesma ordem do Legend/Lines, reordenamos series na mesma ordem
    const seriesSorted = [...serieLiga.series].sort((a, b) =>
      a.nome.localeCompare(b.nome)
    );

    const maxRodada = Number(serieLiga.max_rodada || 0);

    const chartData = Array.from({ length: maxRodada }, (_, i) => {
      const rodada = i + 1;
      const row: any = { rodada };
      for (const s of seriesSorted) {
        row[s.nome] = Number(s.data?.[i] ?? 0);
      }
      return row;
    });

    return { chartData, usuarios };
  }, [serieLiga]);

  const maxPontosLiga = useMemo(() => {
    if (!serieLiga || !serieLiga.series || serieLiga.series.length === 0) return 0;
    let mx = 0;
    for (const s of serieLiga.series) {
      for (const v of s.data || []) {
        const n = Number(v || 0);
        if (n > mx) mx = n;
      }
    }
    return mx;
  }, [serieLiga]);

  // ====== UI ======

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      {/* Header */}
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
            Gráficos
          </h1>

          <Link
            href={`/app/ligas/${ligaId}`}
            style={{ textDecoration: "none", fontWeight: 600 }}
          >
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

      {/* Card: Minha evolução */}
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4, fontWeight: 600 }}>
              Minha pontuação acumulada
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Rodada × Pontuação acumulada
            </p>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>Até a rodada:</span>

            <select
              value={rodadaAteUser ?? ""}
              onChange={(e) =>
                setRodadaAteUser(e.target.value ? Number(e.target.value) : null)
              }
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
              disabled={!rodadaMaxExistente}
            >
              {Array.from({ length: rodadaMaxExistente }, (_, i) => i + 1).map(
                (r) => (
                  <option key={r} value={r}>
                    {r}
                    {r === rodadaMaxFinalizada ? " (última finalizada)" : ""}
                  </option>
                )
              )}
            </select>
          </label>

          {loading ? (
            <span style={{ fontSize: 14, opacity: 0.75 }}>Carregando...</span>
          ) : null}
        </div>

        {!loading && serie.length === 0 ? (
          <p style={{ marginTop: 12 }}>Sem dados para exibir.</p>
        ) : null}

        {!loading && serie.length > 0 ? (
          <div style={{ width: "100%", height: 320, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={serie}
                margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="rodada"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, Math.max(5, maxPontos)]}
                  allowDecimals={false}
                />
                <Tooltip content={<UsuarioTooltip nome={user?.nome ?? ""} />} />
                <Line
                  type="monotone"
                  dataKey="pontuacao_acumulada"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </section>

      {/* Card: Evolução da liga (todos) */}
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4, fontWeight: 600 }}>
              Evolução da liga
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Pontuação acumulada de todos os membros (até a rodada selecionada)
            </p>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 600 }}>Até a rodada:</span>

            <select
              value={rodadaAteLiga ?? ""}
              onChange={(e) =>
                setRodadaAteLiga(e.target.value ? Number(e.target.value) : null)
              }
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                border: "1px solid #ddd",
              }}
              disabled={!rodadaMaxExistente}
            >
              {Array.from({ length: rodadaMaxExistente }, (_, i) => i + 1).map(
                (r) => (
                  <option key={r} value={r}>
                    {r}
                    {r === rodadaMaxFinalizada ? " (última finalizada)" : ""}
                  </option>
                )
              )}
            </select>
          </label>
        </div>

        {!loading && ligaChart.chartData.length === 0 ? (
          <p style={{ marginTop: 12 }}>Sem dados para exibir.</p>
        ) : null}

        {!loading && ligaChart.chartData.length > 0 ? (
          <div style={{ width: "100%", height: 380, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={ligaChart.chartData}
                margin={{ top: 10, right: 16, left: 0, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="rodada"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  domain={[0, Math.max(5, maxPontosLiga)]}
                  allowDecimals={false}
                />

                <Tooltip content={<LigaTooltip />} />

                <Legend formatter={(value) => firstName(String(value))} />

                {ligaChart.usuarios.map((nomeCompleto, idx) => (
                  <Line
                    key={nomeCompleto}
                    type="monotone"
                    dataKey={nomeCompleto}
                    stroke={colorForIndex(idx)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : null}
      </section>

      {/* Card: Pizza */}
      <section style={sectionStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={{ marginTop: 0, marginBottom: 4, fontWeight: 600 }}>
              Distribuição de acertos
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              Placar / Saldo / Resultado / Erros
            </p>
          </div>

          {loadingPizza ? (
            <span style={{ fontSize: 14, opacity: 0.75 }}>Carregando...</span>
          ) : null}
        </div>

        {!loadingPizza && pizzaData.length === 0 ? (
          <p style={{ marginTop: 12 }}>Sem dados para exibir.</p>
        ) : null}

        {!loadingPizza && pizzaData.length > 0 ? (
          <div style={{ width: "100%", height: 320, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pizzaData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label={(d: any) => `${d.name} ${d.percent}%`}
                >
                  {pizzaData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728"][idx % 4]}
                    />
                  ))}
                </Pie>

                <Legend
                  formatter={(value: any, entry: any) => {
                    const v = entry?.payload?.value ?? 0;
                    const p = entry?.payload?.percent ?? 0;
                    return `${value} — ${v} (${p}%)`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : null}
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

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

/**
 * Versão mais rápida do cálculo de rodadas:
 * - Faz requisições em paralelo com limite (batch)
 * - Continua parando quando uma rodada não existe
 *
 * OBS: O ideal é trocar isso por 1 endpoint no backend.
 */
async function calcularInfoRodadasRapido(temporadaId: number) {
  const LIMITE_MAX = 60; // segurança
  const CONCURRENCY = 6;

  // helper: busca uma rodada e diz se existe e se está finalizada
  async function fetchRodada(rodada: number) {
    const jogos = await listarJogos({ temporada_id: temporadaId, rodada });
    const existe = Array.isArray(jogos) && jogos.length > 0;
    const todosFinalizados =
      existe && jogos.every((j: any) => j.status === "finalizado");
    return { rodada, existe, todosFinalizados };
  }

  // roda em batches: [1..6], [7..12], ...
  let ultimaRodadaExistente = 0;
  let ultimaRodadaFinalizada = 0;

  for (let start = 1; start <= LIMITE_MAX; start += CONCURRENCY) {
    const batch = Array.from({ length: CONCURRENCY }, (_, i) => start + i).filter(
      (r) => r <= LIMITE_MAX
    );

    const results = await Promise.all(batch.map(fetchRodada));

    // processa em ordem
    for (const r of results.sort((a, b) => a.rodada - b.rodada)) {
      if (!r.existe) {
        // parou: achou a primeira que não existe
        const defaultRodada =
          (ultimaRodadaFinalizada > 0 ? ultimaRodadaFinalizada : ultimaRodadaExistente) ||
          1;

        return {
          ultimaRodadaExistente,
          ultimaRodadaFinalizada,
          defaultRodada,
        };
      }

      ultimaRodadaExistente = r.rodada;
      if (r.todosFinalizados) {
        ultimaRodadaFinalizada = r.rodada;
      } else {
        // achou a primeira rodada existente que não está finalizada
        const defaultRodada =
          (ultimaRodadaFinalizada > 0 ? ultimaRodadaFinalizada : ultimaRodadaExistente) ||
          1;

        return {
          ultimaRodadaExistente,
          ultimaRodadaFinalizada,
          defaultRodada,
        };
      }
    }
  }

  const defaultRodada =
    (ultimaRodadaFinalizada > 0 ? ultimaRodadaFinalizada : ultimaRodadaExistente) || 1;

  return {
    ultimaRodadaExistente,
    ultimaRodadaFinalizada,
    defaultRodada,
  };
}

function firstName(full: string) {
  const s = (full || "").trim();
  if (!s) return "Usuário";
  return s.split(/\s+/)[0];
}

function UsuarioTooltip({
  active,
  payload,
  label,
  nome,
}: {
  active?: boolean;
  payload?: any[];
  label?: number;
  nome: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const pontos = payload[0]?.value;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>Rodada {label}</div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span>{firstName(nome)}</span>
        <span style={{ fontWeight: 700 }}>{pontos}</span>
      </div>
    </div>
  );
}

function LigaTooltip(props: any) {
  const { active, label, payload } = props;

  if (!active || !payload || payload.length === 0) return null;

  const items = payload
    .filter((p: any) => p && p.dataKey && typeof p.value === "number")
    .map((p: any) => ({
      nomeCompleto: String(p.dataKey),
      value: Number(p.value),
      color: p.color,
    }))
    .sort((a: any, b: any) => b.value - a.value);

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        minWidth: 220,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Rodada {label}</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((it: any, idx: number) => (
          <div
            key={it.nomeCompleto}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 28, opacity: 0.75 }}>#{idx + 1}</span>

              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: it.color,
                  display: "inline-block",
                }}
              />

              <span style={{ fontWeight: 600 }}>
                {firstName(it.nomeCompleto)}
              </span>
            </div>

            <span style={{ fontWeight: 700 }}>{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Paleta simples e estável (cores fixas por índice)
const PALETTE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

function colorForIndex(i: number) {
  return PALETTE[i % PALETTE.length];
}
