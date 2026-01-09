"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  listarCompeticoes,
  criarCompeticao,
  buscarCompeticao,
  atualizarCompeticao,
  deletarCompeticao,
} from "@/app/api/competicoes";

import type { Competicao } from "@/app/types/competicao";

export default function AdminCompeticoesPage() {
  const [items, setItems] = useState<Competicao[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // criar
  const [novoNome, setNovoNome] = useState("");
  const [novoPais, setNovoPais] = useState("");
  const [novoTipo, setNovoTipo] = useState("");

  // buscar por id
  const [buscarId, setBuscarId] = useState<number | "">("");
  const [buscado, setBuscado] = useState<Competicao | null>(null);
  const [loadingBuscar, setLoadingBuscar] = useState(false);

  // editar
  const [editId, setEditId] = useState<number | "">("");
  const [editNome, setEditNome] = useState("");
  const [editPais, setEditPais] = useState("");
  const [editTipo, setEditTipo] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);

  // excluir
  const [deleteId, setDeleteId] = useState<number | "">("");
  const [loadingDelete, setLoadingDelete] = useState(false);

  const idsDisponiveis = useMemo(() => items.map((x) => x.id), [items]);

  function resetAlerts() {
    setErr(null);
    setOk(null);
  }

  function clearCreateFields() {
    setNovoNome("");
    setNovoPais("");
    setNovoTipo("");
  }

  function fillEditFromCompeticao(c: Competicao) {
    setEditId(c.id);
    setEditNome(c.nome ?? "");
    setEditPais(c.pais ?? "");
    setEditTipo(c.tipo ?? "");
  }

  async function refreshList() {
    resetAlerts();
    setLoadingList(true);
    try {
      const data = await listarCompeticoes();
      setItems(data);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    refreshList();
  }, []);

  // Busca “de verdade” por ID (sempre via GET /competicoes/{id})
  async function loadCompeticaoById(id: number, opts?: { alsoFillEdit?: boolean }) {
    resetAlerts();
    setLoadingBuscar(true);
    try {
      const data = await buscarCompeticao(id);
      setBuscado(data);

      if (opts?.alsoFillEdit) {
        fillEditFromCompeticao(data);
      }

      setOk(`Competição #${data.id} carregada.`);
      return data;
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
      setBuscado(null);
      return null;
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function onCreate() {
    resetAlerts();

    // No seu DB, pais/tipo são NOT NULL (você já viu isso no erro).
    const nome = novoNome.trim();
    const pais = novoPais.trim();
    const tipo = novoTipo.trim();

    if (!nome || !pais || !tipo) {
      setErr("Informe nome, país e tipo.");
      return;
    }

    try {
      await criarCompeticao({ nome, pais, tipo });
      clearCreateFields();
      setOk("Competição criada com sucesso.");
      await refreshList();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    }
  }

  async function onBuscarPorId() {
    resetAlerts();
    setBuscado(null);

    if (buscarId === "") {
      setErr("Informe um ID para buscar.");
      return;
    }

    const id = Number(buscarId);
    await loadCompeticaoById(id, { alsoFillEdit: true });
  }

  async function onUpdate() {
    resetAlerts();

    if (editId === "") {
      setErr("Informe o ID para atualizar.");
      return;
    }

    const id = Number(editId);

    // IMPORTANTE:
    // Se você mandar pais/tipo vazio, o backend pode acabar setando None e quebrar no NOT NULL.
    // Então aqui a regra é: update sempre “completo” (nome/pais/tipo não vazios).
    const nome = editNome.trim();
    const pais = editPais.trim();
    const tipo = editTipo.trim();

    if (!nome || !pais || !tipo) {
      setErr("Para atualizar, informe nome, país e tipo (não podem ficar vazios).");
      return;
    }

    setLoadingEdit(true);
    try {
      const updated = await atualizarCompeticao(id, { nome, pais, tipo });
      setOk(`Competição #${updated.id} atualizada.`);

      // mantém buscado consistente
      setBuscado((prev) => (prev?.id === updated.id ? updated : prev));

      await refreshList();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoadingEdit(false);
    }
  }

  async function onDelete() {
    resetAlerts();

    if (deleteId === "") {
      setErr("Informe o ID para excluir.");
      return;
    }

    const id = Number(deleteId);

    const confirmMsg = `Tem certeza que deseja excluir a competição #${id}?`;
    if (!window.confirm(confirmMsg)) return;

    setLoadingDelete(true);
    try {
      await deletarCompeticao(id);
      setOk(`Competição #${id} excluída.`);

      // limpa estados relacionados se estavam apontando pro mesmo id
      setBuscado((prev) => (prev?.id === id ? null : prev));

      if (editId === id) {
        setEditId("");
        setEditNome("");
        setEditPais("");
        setEditTipo("");
      }

      if (buscarId === id) {
        setBuscarId("");
      }

      setDeleteId("");

      await refreshList();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoadingDelete(false);
    }
  }

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
            Admin · Competições
          </h1>

          <Link href="/app" style={{ textDecoration: "none", fontWeight: 600 }}>
            Voltar
          </Link>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.9 }}>
          CRUD completo de competições (nome, país, tipo).
        </p>
      </section>

      {err ? (
        <div style={alertStyle("error")}>
          <strong>Erro:</strong> {err}
        </div>
      ) : null}

      {ok ? (
        <div style={alertStyle("success")}>
          <strong>OK:</strong> {ok}
        </div>
      ) : null}

      {/* Listar */}
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
              Lista
            </h2>
            <p style={{ margin: 0, opacity: 0.85 }}>
              {loadingList ? "Carregando..." : `${items.length} item(ns)`}
            </p>
          </div>

          <button
            onClick={refreshList}
            style={btnStyle("ghost")}
            disabled={loadingList}
          >
            Recarregar
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          {loadingList ? (
            <p style={{ margin: 0 }}>Carregando...</p>
          ) : items.length === 0 ? (
            <p style={{ margin: 0 }}>Nenhuma competição cadastrada.</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {items.map((c) => (
                <div
                  key={c.id}
                  style={{
                    border: "1px solid #eee",
                    borderRadius: 10,
                    padding: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>
                      #{c.id} — {c.nome}
                    </div>
                    <div style={{ opacity: 0.85, fontSize: 14 }}>
                      {(c.pais ?? "-")} · {(c.tipo ?? "-")}
                    </div>
                  </div>

                  <button
                    style={btnStyle("ghost")}
                    onClick={async () => {
                      // ✅ Não usa "c" como buscado (evita dados inconsistentes)
                      setBuscarId(c.id);
                      setEditId(c.id);
                      resetAlerts();
                      await loadCompeticaoById(c.id, { alsoFillEdit: true });
                    }}
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        
      </section>

      {/* Criar */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Criar</h2>

        <div style={rowStyle}>
          <label style={fieldStyle}>
            <span>Nome</span>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Ex: Brasileirão"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>País</span>
            <input
              value={novoPais}
              onChange={(e) => setNovoPais(e.target.value)}
              placeholder="Ex: Brasil"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>Tipo</span>
            <input
              value={novoTipo}
              onChange={(e) => setNovoTipo(e.target.value)}
              placeholder="Ex: Liga"
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <button style={btnStyle("primary")} onClick={onCreate}>
              Criar
            </button>

            <button
              style={btnStyle("ghost")}
              onClick={() => {
                resetAlerts();
                clearCreateFields();
              }}
              type="button"
            >
              Limpar
            </button>
          </div>
        </div>
      </section>

      {/* Buscar por ID */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Buscar por ID</h2>

        <div style={rowStyle}>
          <label style={fieldStyle}>
            <span>ID</span>
            <input
              value={buscarId}
              onChange={(e) =>
                setBuscarId(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ex: 1"
              type="number"
              style={inputStyle}
            />
          </label>

          <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
            <button
              style={btnStyle("ghost")}
              onClick={onBuscarPorId}
              disabled={loadingBuscar}
            >
              {loadingBuscar ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>

        {buscado ? (
          <div
            style={{
              marginTop: 12,
              border: "1px solid #eee",
              borderRadius: 10,
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>Resultado</div>
            <div style={{ marginTop: 6 }}>
              <div>
                <strong>ID:</strong> {buscado.id}
              </div>
              <div>
                <strong>Nome:</strong> {buscado.nome}
              </div>
              <div>
                <strong>País:</strong> {buscado.pais ?? "-"}
              </div>
              <div>
                <strong>Tipo:</strong> {buscado.tipo ?? "-"}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* Atualizar por ID */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Atualizar por ID</h2>

        <div style={rowStyle}>
          <label style={fieldStyle}>
            <span>ID</span>
            <input
              value={editId}
              onChange={(e) =>
                setEditId(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ex: 1"
              type="number"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>Nome</span>
            <input
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Ex: Brasileirão Série A"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>País</span>
            <input
              value={editPais}
              onChange={(e) => setEditPais(e.target.value)}
              placeholder="Ex: Brasil"
              style={inputStyle}
            />
          </label>

          <label style={fieldStyle}>
            <span>Tipo</span>
            <input
              value={editTipo}
              onChange={(e) => setEditTipo(e.target.value)}
              placeholder="Ex: Liga"
              style={inputStyle}
            />
          </label>

          <button
            style={btnStyle("primary")}
            onClick={onUpdate}
            disabled={loadingEdit}
          >
            {loadingEdit ? "Salvando..." : "Atualizar"}
          </button>
        </div>

        <p style={{ marginTop: 10, marginBottom: 0, opacity: 0.75, fontSize: 13 }}>
          Dica: clique em <strong>Editar</strong> na lista para carregar os campos antes de atualizar.
        </p>
      </section>

      {/* Excluir por ID */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Excluir por ID</h2>

        <div style={rowStyle}>
          <label style={fieldStyle}>
            <span>ID</span>
            <input
              value={deleteId}
              onChange={(e) =>
                setDeleteId(e.target.value === "" ? "" : Number(e.target.value))
              }
              placeholder="Ex: 1"
              type="number"
              style={inputStyle}
            />
          </label>

          <button
            style={btnStyle("danger")}
            onClick={onDelete}
            disabled={loadingDelete}
          >
            {loadingDelete ? "Excluindo..." : "Excluir"}
          </button>
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

function btnStyle(kind: "primary" | "ghost" | "danger"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    cursor: "pointer",
    fontWeight: 700,
    height: 42,
    background: "white",
  };

  if (kind === "primary") return { ...base };
  if (kind === "danger") return { ...base, borderColor: "#f3c2c2" };
  return { ...base, background: "transparent" };
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
};

// ✅ Agora o layout se adapta à quantidade de campos (sem quebrar quando tem 5 inputs)
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
