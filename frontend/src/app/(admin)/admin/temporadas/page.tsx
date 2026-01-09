"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { listarCompeticoes } from "@/app/api/competicoes";
import {
  listarTemporadas,
  criarTemporada,
  buscarTemporada,
  atualizarTemporada,
  deletarTemporada,
} from "@/app/api/temporadas";

import type { Competicao } from "@/app/types/competicao";
import type { Temporada, TemporadaCreate, TemporadaUpdate } from "@/app/types/temporada";

export default function AdminTemporadasPage() {
  const [competicoes, setCompeticoes] = useState<Competicao[]>([]);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [loading, setLoading] = useState(true);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // criar
  const [novoCompeticaoId, setNovoCompeticaoId] = useState<number | "">("");
  const [novoAno, setNovoAno] = useState<number | "">("");
  const [novoInicio, setNovoInicio] = useState<string>("");
  const [novoFim, setNovoFim] = useState<string>("");
  const [novoStatus, setNovoStatus] = useState<string>("planejada");
  const [loadingCreate, setLoadingCreate] = useState(false);

  // buscar por id
  const [buscarId, setBuscarId] = useState<number | "">("");
  const [buscada, setBuscada] = useState<Temporada | null>(null);
  const [loadingBuscar, setLoadingBuscar] = useState(false);

  // atualizar
  const [updCompeticaoId, setUpdCompeticaoId] = useState<number | "">("");
  const [updAno, setUpdAno] = useState<number | "">("");
  const [updInicio, setUpdInicio] = useState<string>("");
  const [updFim, setUpdFim] = useState<string>("");
  const [updStatus, setUpdStatus] = useState<string>("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  // deletar
  const [delId, setDelId] = useState<number | "">("");
  const [loadingDelete, setLoadingDelete] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      setOk(null);
      try {
        const [cs, ts] = await Promise.all([listarCompeticoes(), listarTemporadas()]);
        setCompeticoes(cs);
        setTemporadas(ts);
      } catch (e: any) {
        setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao carregar dados.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const competicaoNomeById = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of competicoes) map.set(c.id, c.nome);
    return map;
  }, [competicoes]);

  async function refreshTemporadas() {
    const ts = await listarTemporadas();
    setTemporadas(ts);
  }

  function clearMsgs() {
    setErr(null);
    setOk(null);
  }

  async function handleCreate() {
    clearMsgs();
    if (!novoCompeticaoId || !novoAno) {
      setErr("Informe competição e ano.");
      return;
    }

    const payload: TemporadaCreate = {
      competicao_id: Number(novoCompeticaoId),
      ano: Number(novoAno),
      data_inicio: novoInicio ? novoInicio : null,
      data_fim: novoFim ? novoFim : null,
      status: novoStatus || "planejada",
    };

    setLoadingCreate(true);
    try {
      await criarTemporada(payload);
      setOk("Temporada criada!");
      setNovoCompeticaoId("");
      setNovoAno("");
      setNovoInicio("");
      setNovoFim("");
      setNovoStatus("planejada");
      await refreshTemporadas();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao criar temporada.");
    } finally {
      setLoadingCreate(false);
    }
  }

  async function handleBuscar() {
    clearMsgs();
    if (!buscarId) {
      setErr("Informe um ID para buscar.");
      return;
    }
    setLoadingBuscar(true);
    try {
      const t = await buscarTemporada(Number(buscarId));
      setBuscada(t);

      // pré-preenche update com o encontrado
      setUpdCompeticaoId(t.competicao_id);
      setUpdAno(t.ano);
      setUpdInicio(t.data_inicio ?? "");
      setUpdFim(t.data_fim ?? "");
      setUpdStatus(t.status ?? "");
      setOk("Temporada carregada para edição.");
    } catch (e: any) {
      setBuscada(null);
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao buscar temporada.");
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function handleUpdate() {
    clearMsgs();
    if (!buscarId) {
      setErr("Busque uma temporada por ID antes de atualizar.");
      return;
    }

    const payload: TemporadaUpdate = {};
    if (updCompeticaoId !== "") payload.competicao_id = Number(updCompeticaoId);
    if (updAno !== "") payload.ano = Number(updAno);
    payload.data_inicio = updInicio ? updInicio : null;
    payload.data_fim = updFim ? updFim : null;
    if (updStatus !== "") payload.status = updStatus;

    setLoadingUpdate(true);
    try {
      await atualizarTemporada(Number(buscarId), payload);
      setOk("Temporada atualizada!");
      await refreshTemporadas();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao atualizar temporada.");
    } finally {
      setLoadingUpdate(false);
    }
  }

  async function handleDelete() {
    clearMsgs();
    if (!delId) {
      setErr("Informe um ID para deletar.");
      return;
    }
    setLoadingDelete(true);
    try {
      await deletarTemporada(Number(delId));
      setOk("Temporada deletada!");
      setDelId("");
      await refreshTemporadas();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao deletar temporada.");
    } finally {
      setLoadingDelete(false);
    }
  }

  const pageStyle: React.CSSProperties = { padding: 24, maxWidth: 1100, margin: "0 auto" };
  const headerStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12 };
  const sectionStyle: React.CSSProperties = {
    marginTop: 18,
    padding: 16,
    border: "1px solid #e5e5e5",
    borderRadius: 10,
  };
  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    alignItems: "start",
  };
  const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 };
  const inputStyle: React.CSSProperties = {
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: 8,
    outline: "none",
  };
  const btnStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #ddd",
    cursor: "pointer",
    background: "#fff",
  };
  const smallText: React.CSSProperties = { fontSize: 13, opacity: 0.8 };
  const pillOk: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#e9f7ef",
    border: "1px solid #b7e4c7",
    marginTop: 10,
  };
  const pillErr: React.CSSProperties = {
    padding: "8px 10px",
    borderRadius: 8,
    background: "#fdecec",
    border: "1px solid #f5c2c7",
    marginTop: 10,
  };

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
            Admin · Temporadas
          </h1>

          <Link href="/app" style={{ textDecoration: "none", fontWeight: 600 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.9 }}>
          CRUD completo de temporadas.
        </p>
      </section>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 , fontWeight: 600}}>Lista</h2>

            {temporadas.length === 0 ? (
              <p>Nenhuma temporada cadastrada.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["ID", "Competição", "Ano", "Início", "Fim", "Status"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 8px",
                            borderBottom: "1px solid #eee",
                            fontSize: 13,
                            opacity: 0.85,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {temporadas.map((t) => (
                      <tr key={t.id}>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>{t.id}</td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                          {competicaoNomeById.get(t.competicao_id) ?? `#${t.competicao_id}`}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>{t.ano}</td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                          {t.data_inicio ?? "-"}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>{t.data_fim ?? "-"}</td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>{t.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section style={sectionStyle}>
            <h2 style={{ marginTop: 0 , fontWeight: 600}}>Ações</h2>

            <div style={gridStyle}>
              <div>
                <h3 style={{ marginTop: 0 , fontWeight: 600}}>Criar temporada</h3>

                <label style={fieldStyle}>
                  <span>Competição</span>
                  <select
                    value={novoCompeticaoId}
                    onChange={(e) => setNovoCompeticaoId(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
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
                  <input
                    type="number"
                    value={novoAno}
                    onChange={(e) => setNovoAno(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
                    placeholder="ex: 2026"
                  />
                </label>

                <label style={fieldStyle}>
                  <span>Data início</span>
                  <input type="date" value={novoInicio} onChange={(e) => setNovoInicio(e.target.value)} style={inputStyle} />
                </label>

                <label style={fieldStyle}>
                  <span>Data fim</span>
                  <input type="date" value={novoFim} onChange={(e) => setNovoFim(e.target.value)} style={inputStyle} />
                </label>

                <label style={fieldStyle}>
                  <span>Status</span>
                  <select value={novoStatus} onChange={(e) => setNovoStatus(e.target.value)} style={inputStyle}>
                    <option value="planejada">planejada</option>
                    <option value="em_andamento">em_andamento</option>
                    <option value="finalizada">finalizada</option>
                  </select>
                </label>

                <button onClick={handleCreate} style={btnStyle} disabled={loadingCreate}>
                  {loadingCreate ? "Criando..." : "Criar"}
                </button>
              </div>

              <div>
                <h3 style={{ marginTop: 0 , fontWeight: 600}}>Buscar / Atualizar / Deletar</h3>

                <label style={fieldStyle}>
                  <span>Buscar por ID</span>
                  <input
                    type="number"
                    value={buscarId}
                    onChange={(e) => setBuscarId(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
                    placeholder="ex: 1"
                  />
                </label>

                <button onClick={handleBuscar} style={btnStyle} disabled={loadingBuscar}>
                  {loadingBuscar ? "Buscando..." : "Buscar"}
                </button>

                <div style={{ height: 12 }} />

                <label style={fieldStyle}>
                  <span>Competição</span>
                  <select
                    value={updCompeticaoId}
                    onChange={(e) => setUpdCompeticaoId(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
                  >
                    <option value="">(não alterar)</option>
                    {competicoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={fieldStyle}>
                  <span>Ano</span>
                  <input
                    type="number"
                    value={updAno}
                    onChange={(e) => setUpdAno(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
                    placeholder="ex: 2026"
                  />
                </label>

                <label style={fieldStyle}>
                  <span>Data início</span>
                  <input type="date" value={updInicio} onChange={(e) => setUpdInicio(e.target.value)} style={inputStyle} />
                </label>

                <label style={fieldStyle}>
                  <span>Data fim</span>
                  <input type="date" value={updFim} onChange={(e) => setUpdFim(e.target.value)} style={inputStyle} />
                </label>

                <label style={fieldStyle}>
                  <span>Status</span>
                  <input
                    value={updStatus}
                    onChange={(e) => setUpdStatus(e.target.value)}
                    style={inputStyle}
                    placeholder="planejada | em_andamento | finalizada"
                  />
                </label>

                <button onClick={handleUpdate} style={btnStyle} disabled={loadingUpdate}>
                  {loadingUpdate ? "Atualizando..." : "Atualizar"}
                </button>

                <div style={{ height: 12 }} />

                <label style={fieldStyle}>
                  <span>Deletar por ID</span>
                  <input
                    type="number"
                    value={delId}
                    onChange={(e) => setDelId(e.target.value ? Number(e.target.value) : "")}
                    style={inputStyle}
                    placeholder="ex: 1"
                  />
                </label>

                <button onClick={handleDelete} style={btnStyle} disabled={loadingDelete}>
                  {loadingDelete ? "Deletando..." : "Deletar"}
                </button>

                {buscada && (
                  <p style={{ marginTop: 10, ...smallText }}>
                    Carregada: #{buscada.id} · {competicaoNomeById.get(buscada.competicao_id) ?? `#${buscada.competicao_id}`} ·{" "}
                    {buscada.ano}
                  </p>
                )}
              </div>
            </div>

            {ok && <div style={pillOk}>{ok}</div>}
            {err && <div style={pillErr}>{err}</div>}
          </section>
        </>
      )}
    </main>
  );
}
