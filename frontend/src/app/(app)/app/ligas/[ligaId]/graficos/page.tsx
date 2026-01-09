"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { listarMinhasLigas } from "@/app/api/ligas";
import { getPontuacaoAcumuladaUsuario, getPontuacaoAcumuladaTodos } from "@/app/api/pontuacao";
import { listarJogos } from "@/app/api/jogos";
import { useAuth } from "@/app/auth/AuthContext";

import { getRankingGeral } from "@/app/api/ranking";
import type { RankingGeralItem } from "@/app/types/ranking";



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

export default function GraficosPage() {
  const params = useParams();
  const ligaId = Number(params?.ligaId);

  const { user } = useAuth();

  const [liga, setLiga] = useState<Liga | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [rodadaMaxFinalizada, setRodadaMaxFinalizada] = useState<number>(0);
  const [rodadaMaxExistente, setRodadaMaxExistente] = useState<number>(0);
  const [rodadaAteUser, setRodadaAteUser] = useState<number | null>(null);
  const [rodadaAteLiga, setRodadaAteLiga] = useState<number | null>(null);


  const [serie, setSerie] = useState<PontuacaoAcumuladaItem[]>([]);
  const [serieLigaRaw, setSerieLigaRaw] = useState<PontuacaoAcumuladaItem[]>([]);

  const [pizzaData, setPizzaData] = useState<{ name: string; value: number; percent: number }[]>([]);
  const [loadingPizza, setLoadingPizza] = useState(false);



  // 1) Carrega liga (pra mostrar nome no header, igual ao ranking)
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

  // 2) Descobre última rodada existente e última rodada finalizada (rodada é required no endpoint /jogos)
  useEffect(() => {
    if (!liga) return;

    const temporadaId = liga.temporada_id;

    let mounted = true;

    async function loadRodadas() {
      setErr(null);
      setLoading(true);

      try {
        const info = await calcularInfoRodadas(temporadaId);
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

  // 3) Carrega pontuação acumulada do usuário logado (rodada required no backend)
  useEffect(() => {
    if (!liga) return;
    if (!user?.nome) return;
    if (!rodadaAteUser) return;

    const _ligaId = liga.id;
    const _usuarioNome = user.nome;
    const _rodada = rodadaAteUser;

    let mounted = true;

    async function loadSerie() {
      setErr(null);
      setLoading(true);

      try {
        const data = await getPontuacaoAcumuladaUsuario(_ligaId, _usuarioNome, _rodada);
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

  useEffect(() => {
  if (!liga) return;
  if (!rodadaAteLiga) return;

  const _ligaId = liga.id;
  const _rodada = rodadaAteLiga;

  let mounted = true;

  async function loadSerieLiga() {
    try {
      const data = await getPontuacaoAcumuladaTodos(_ligaId, _rodada);
      if (!mounted) return;

      // ordena por rodada (e por nome só para estabilidade)
      const sorted = [...data].sort((a, b) => (a.rodada - b.rodada) || a.nome.localeCompare(b.nome));
      setSerieLigaRaw(sorted);
    } catch (e: any) {
      if (!mounted) return;
      // se quiser, você pode ter um err separado; por enquanto usa o mesmo
      setErr(extractApiErrorMessage(e));
    }
  }

  loadSerieLiga();
  return () => {
    mounted = false;
  };
  }, [liga, rodadaAteLiga]);

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

        // 🔸 se o nome pode variar, você pode trocar por includes/like depois
        const eu =
            ranking.find((x) => x.nome === _nome) ??
            ranking.find((x) => x.nome.toLowerCase().includes(_nome.toLowerCase()));

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



  const maxPontos = useMemo(() => {
    if (serie.length === 0) return 0;
    return Math.max(...serie.map((x) => x.pontuacao_acumulada));
  }, [serie]);

  const ligaPivot = useMemo(() => {
  return pivotPontuacaoPorRodada(serieLigaRaw);
  }, [serieLigaRaw]);

  const maxPontosLiga = useMemo(() => {
    const d = ligaPivot.chartData;
    if (!d.length) return 0;

    // pega o maior valor entre todos os usuários em todas as rodadas
    let mx = 0;
    for (const row of d) {
      for (const nome of ligaPivot.usuarios) {
        const v = Number(row[nome] ?? 0);
        if (v > mx) mx = v;
      }
    }
    return mx;
  }, [ligaPivot]);


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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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
              onChange={(e) => setRodadaAteUser(Number(e.target.value))}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
              disabled={!rodadaMaxExistente}
            >
              {Array.from({ length: rodadaMaxExistente }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  {r}
                  {r === rodadaMaxFinalizada ? " (última finalizada)" : ""}
                </option>
              ))}
            </select>
          </label>

          {loading ? <span style={{ fontSize: 14, opacity: 0.75 }}>Carregando...</span> : null}
        </div>

        {!loading && serie.length === 0 ? (
          <p style={{ marginTop: 12 }}>Sem dados para exibir.</p>
        ) : null}

        {!loading && serie.length > 0 ? (
          <div style={{ width: "100%", height: 320, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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
              onChange={(e) => setRodadaAteLiga(Number(e.target.value))}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
              disabled={!rodadaMaxExistente}
            >
              {Array.from({ length: rodadaMaxExistente }, (_, i) => i + 1).map((r) => (
                <option key={r} value={r}>
                  {r}
                  {r === rodadaMaxFinalizada ? " (última finalizada)" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!loading && ligaPivot.chartData.length === 0 ? (
            <p style={{ marginTop: 12 }}>Sem dados para exibir.</p>
        ) : null}

        {!loading && ligaPivot.chartData.length > 0 ? (
            <div style={{ width: "100%", height: 380, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ligaPivot.chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
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

                <Tooltip content={<LigaTooltip />}/>

                <Legend
                    formatter={(value) => firstName(String(value))}
                />

                {ligaPivot.usuarios.map((nomeCompleto, idx) => (
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

        <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
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

/** Evita "[object Object]" com FastAPI (mesma lógica que você usa nas páginas) */
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
 * Como /jogos exige rodada, descobrimos a última rodada existente e a última finalizada
 * consultando rodada por rodada até não existir mais (ou até achar a primeira não finalizada).
 */
async function calcularInfoRodadas(temporadaId: number) {
  let rodada = 1;
  let ultimaRodadaExistente = 0;
  let ultimaRodadaFinalizada = 0;

  const LIMITE_MAX = 60; // segurança (competição pode ter menos)

  while (rodada <= LIMITE_MAX) {
    const jogos = await listarJogos({ temporada_id: temporadaId, rodada });

    // Se backend retorna [] quando não existe rodada, paramos
    if (!jogos || jogos.length === 0) break;

    ultimaRodadaExistente = rodada;

    const todosFinalizados = jogos.every((j: any) => j.status === "finalizado");
    if (todosFinalizados) {
      ultimaRodadaFinalizada = rodada;
      rodada += 1;
      continue;
    }

    // achou a primeira rodada ainda não 100% finalizada => para aqui
    break;
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
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 10,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        fontSize: 14,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>
        Rodada {label}
      </div>

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

  // payload: [{ name: "Fulano", value: 12, color: "#...", dataKey: "Fulano", ...}, ...]
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
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
        minWidth: 220,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>
        Rodada {label}
      </div>

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
              <span style={{ width: 28, opacity: 0.75 }}>
                #{idx + 1}
              </span>

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

            <span style={{ fontWeight: 700 }}>
              {it.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}


function pivotPontuacaoPorRodada(items: PontuacaoAcumuladaItem[]) {
  // Retorna:
  // - chartData: [{ rodada: 1, "Paulo": 12, "Maria": 9, ... }, ...]
  // - usuarios: ["Paulo Silva", "Maria Souza", ...] (nomes completos)
  const usuarios = Array.from(new Set(items.map((x) => x.nome))).sort((a, b) => a.localeCompare(b));

  const map = new Map<number, any>();
  for (const it of items) {
    const row = map.get(it.rodada) ?? { rodada: it.rodada };
    row[it.nome] = it.pontuacao_acumulada;
    map.set(it.rodada, row);
  }

  const chartData = Array.from(map.values()).sort((a, b) => a.rodada - b.rodada);
  return { chartData, usuarios };
}

// Paleta simples e estável (cores fixas por índice)
const PALETTE = [
  "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
  "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
];

function colorForIndex(i: number) {
  return PALETTE[i % PALETTE.length];
}



