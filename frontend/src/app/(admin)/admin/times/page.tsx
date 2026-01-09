"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  listarTimes,
  criarTime,
  buscarTime,
  atualizarTime,
  deletarTime,
} from "@/app/api/times";

import type { Time, TimeCreate, TimeUpdate } from "@/app/types/time";

export default function AdminTimesPage() {
  const [items, setItems] = useState<Time[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // criar
  const [novoNome, setNovoNome] = useState("");
  const [novoSigla, setNovoSigla] = useState("");
  const [novoEscudoUrl, setNovoEscudoUrl] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);

  // buscar por id
  const [buscarId, setBuscarId] = useState<number | "">("");
  const [buscado, setBuscado] = useState<Time | null>(null);
  const [loadingBuscar, setLoadingBuscar] = useState(false);

  // atualizar (preenchido ao buscar)
  const [updNome, setUpdNome] = useState("");
  const [updSigla, setUpdSigla] = useState("");
  const [updEscudoUrl, setUpdEscudoUrl] = useState("");
  const [loadingUpdate, setLoadingUpdate] = useState(false);

  // deletar
  const [delId, setDelId] = useState<number | "">("");
  const [loadingDelete, setLoadingDelete] = useState(false);

  async function refresh() {
    const ts = await listarTimes();
    setItems(ts);
  }

  function clearMsgs() {
    setErr(null);
    setOk(null);
  }

  useEffect(() => {
    (async () => {
      setLoadingList(true);
      clearMsgs();
      try {
        await refresh();
      } catch (e: any) {
        setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao listar times.");
      } finally {
        setLoadingList(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate() {
    clearMsgs();

    if (!novoNome.trim()) {
      setErr("Informe o nome do time.");
      return;
    }

    const payload: TimeCreate = {
      nome: novoNome.trim(),
      sigla: novoSigla.trim() ? novoSigla.trim().toUpperCase() : null,
      escudo_url: novoEscudoUrl.trim() ? novoEscudoUrl.trim() : null,
    };

    setLoadingCreate(true);
    try {
      await criarTime(payload);
      setOk("Time criado!");
      setNovoNome("");
      setNovoSigla("");
      setNovoEscudoUrl("");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao criar time.");
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
      const t = await buscarTime(Number(buscarId));
      setBuscado(t);

      setUpdNome(t.nome ?? "");
      setUpdSigla(t.sigla ?? "");
      setUpdEscudoUrl(t.escudo_url ?? "");

      setOk("Time carregado para edição.");
    } catch (e: any) {
      setBuscado(null);
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao buscar time.");
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function handleUpdate() {
    clearMsgs();

    if (!buscarId) {
      setErr("Busque um time por ID antes de atualizar.");
      return;
    }

    if (!updNome.trim()) {
      setErr("O nome não pode ficar vazio.");
      return;
    }

    const payload: TimeUpdate = {
      nome: updNome.trim(),
      sigla: updSigla.trim() ? updSigla.trim().toUpperCase() : null,
      escudo_url: updEscudoUrl.trim() ? updEscudoUrl.trim() : null,
    };

    setLoadingUpdate(true);
    try {
      const updated = await atualizarTime(Number(buscarId), payload);
      setBuscado(updated);
      setOk("Time atualizado!");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao atualizar time.");
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
      await deletarTime(Number(delId));
      setOk("Time deletado!");
      setDelId("");
      await refresh();
    } catch (e: any) {
      setErr(e?.response?.data?.detail ?? e?.message ?? "Erro ao deletar time.");
    } finally {
      setLoadingDelete(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    padding: 24,
    maxWidth: 1100,
    margin: "0 auto",
  };

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

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 10,
  };

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
            Admin · Times
          </h1>

          <Link href="/app" style={{ textDecoration: "none", fontWeight: 600 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.9 }}>
          CRUD completo de times (nome, sigla, escudo_url).
        </p>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Ações</h2>

        <div style={gridStyle}>
          <div>
            <h3 style={{ marginTop: 0, fontWeight: 600 }}>Criar time</h3>

            <label style={fieldStyle}>
              <span>Nome</span>
              <input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                style={inputStyle}
                placeholder="ex: Flamengo"
              />
            </label>

            <label style={fieldStyle}>
              <span>Sigla</span>
              <input
                value={novoSigla}
                onChange={(e) => setNovoSigla(e.target.value)}
                style={inputStyle}
                placeholder="ex: FLA"
              />
            </label>

            <label style={fieldStyle}>
              <span>escudo_url</span>
              <input
                value={novoEscudoUrl}
                onChange={(e) => setNovoEscudoUrl(e.target.value)}
                style={inputStyle}
                placeholder='ex: "/escudos/flamengo.png"'
              />
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
              <span>Nome</span>
              <input value={updNome} onChange={(e) => setUpdNome(e.target.value)} style={inputStyle} />
            </label>

            <label style={fieldStyle}>
              <span>Sigla</span>
              <input value={updSigla} onChange={(e) => setUpdSigla(e.target.value)} style={inputStyle} />
            </label>

            <label style={fieldStyle}>
              <span>escudo_url</span>
              <input value={updEscudoUrl} onChange={(e) => setUpdEscudoUrl(e.target.value)} style={inputStyle} />
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

            {buscado && (
              <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.85, fontSize: 13 }}>
                Carregado: #{buscado.id} · {buscado.nome} · {buscado.sigla ?? "-"}
              </p>
            )}
          </div>
        </div>

        {ok && <div style={pillOk}>{ok}</div>}
        {err && <div style={pillErr}>{err}</div>}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Lista</h2>

        {loadingList ? (
          <p>Carregando...</p>
        ) : items.length === 0 ? (
          <p>Nenhum time cadastrado.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["ID", "Nome", "Sigla", "Escudo"].map((h) => (
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
                {items.map((t) => (
                  <tr key={t.id}>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      {t.id}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      {t.nome}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      {t.sigla ?? "-"}
                    </td>
                    <td style={{ padding: "10px 8px", borderBottom: "1px solid #f2f2f2" }}>
                      {t.escudo_url ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <img
                            src={t.escudo_url}
                            alt={`Escudo ${t.nome}`}
                            style={{ width: 28, height: 28, objectFit: "contain" }}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                          <span style={{ fontSize: 13, opacity: 0.85 }}>{t.escudo_url}</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section> 

    </main>
  );
}
