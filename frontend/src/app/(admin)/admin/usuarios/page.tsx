"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { api } from "@/app/api/clients";

type UserRole = string;

type UsuarioResponse = {
  id: number;
  nome: string;
  email_login: string;
  funcao: UserRole;
};

type UsuarioUpdate = {
  nome?: string;
  email_login?: string;
  senha?: string; // min 6, max 72 (validado no backend)
};

export default function AdminUsuariosPage() {
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Buscar por ID
  const [buscarId, setBuscarId] = useState<number | "">("");
  const [loadingBuscar, setLoadingBuscar] = useState(false);

  const [buscado, setBuscado] = useState<UsuarioResponse | null>(null);

  // Form de edição
  const [editNome, setEditNome] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSenha, setEditSenha] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lista de usuários (GET /usuarios)
  const [usuarios, setUsuarios] = useState<UsuarioResponse[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // auto-hide do sucesso (padrão UX)
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  function preencherForm(u: UsuarioResponse) {
    setEditNome(u.nome ?? "");
    setEditEmail(u.email_login ?? "");
    setEditSenha("");
  }

  async function carregarUsuarios() {
    setLoadingUsuarios(true);
    setErr(null);

    try {
      const res = await api.get<UsuarioResponse[]>("/usuarios");
      setUsuarios(res.data ?? []);
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoadingUsuarios(false);
    }
  }

  useEffect(() => {
    carregarUsuarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarUsuarioPorId(id: number) {
    setErr(null);
    setMsg(null);

    if (!Number.isInteger(id)) {
      setErr("ID inválido.");
      return;
    }

    setBuscarId(id);
    setLoadingBuscar(true);
    try {
      const res = await api.get<UsuarioResponse>(`/usuarios/${id}`);
      setBuscado(res.data);
      preencherForm(res.data);
      setMsg("Usuário carregado.");
    } catch (e: any) {
      setBuscado(null);
      setErr(extractApiErrorMessage(e));
    } finally {
      setLoadingBuscar(false);
    }
  }

  async function handleBuscar() {
    setErr(null);
    setMsg(null);

    if (buscarId === "" || !Number.isInteger(buscarId)) {
      setErr("Informe um ID válido para buscar.");
      return;
    }

    await carregarUsuarioPorId(Number(buscarId));
  }

  async function handleSalvar() {
    setErr(null);
    setMsg(null);

    if (!buscado) {
      setErr("Busque um usuário primeiro.");
      return;
    }

    const payload: UsuarioUpdate = {};

    const nome = editNome.trim();
    const email = editEmail.trim();
    const senha = editSenha.trim();

    // só envia o que mudou (evita sobrescrever sem querer)
    if (nome && nome !== buscado.nome) payload.nome = nome;
    if (email && email !== buscado.email_login) payload.email_login = email;

    if (senha.length > 0) {
      if (senha.length < 6) {
        setErr("A senha precisa ter pelo menos 6 caracteres.");
        return;
      }
      if (senha.length > 72) {
        setErr("A senha pode ter no máximo 72 caracteres.");
        return;
      }
      payload.senha = senha;
    }

    if (Object.keys(payload).length === 0) {
      setErr("Nada para salvar (nenhuma alteração detectada).");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put<UsuarioResponse>(`/usuarios/${buscado.id}`, payload);
      setBuscado(res.data);
      preencherForm(res.data);
      setMsg("Usuário atualizado com sucesso.");

      await carregarUsuarios();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletar() {
    setErr(null);
    setMsg(null);

    if (!buscado) {
      setErr("Busque um usuário primeiro.");
      return;
    }

    const ok = window.confirm(
      `Tem certeza que deseja excluir o usuário "${buscado.nome}" (ID ${buscado.id})?\nEssa ação é irreversível.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      await api.delete(`/usuarios/${buscado.id}`);

      setMsg("Usuário excluído com sucesso.");
      setBuscado(null);
      setBuscarId("");
      setEditNome("");
      setEditEmail("");
      setEditSenha("");

      await carregarUsuarios();
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  const titulo = useMemo(() => {
    if (!buscado) return "Nenhum usuário carregado";
    return `${buscado.nome} (ID ${buscado.id})`;
  }, [buscado]);

  return (
    <main style={{ padding: 24, maxWidth: 980, margin: "0 auto" }}>
      <section style={sectionStyle}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h1 style={{ marginTop: 0, fontWeight: 700 }}>Admin • Usuários</h1>
        <Link href="/app" style={{ textDecoration: "none", fontWeight: 600 }}>
          Voltar
        </Link>
      </div>

      <p style={{ marginTop: 0 }}>
        Buscar por ID, editar (nome/email/senha) e excluir usuários.
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

      {/* Buscar usuário */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Buscar usuário</h2>

        <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ ...labelStyle, minWidth: 240 }}>
            <span>ID do usuário</span>
            <input
              value={buscarId}
              onChange={(e) => setBuscarId(e.target.value ? Number(e.target.value) : "")}
              placeholder="Ex: 1"
              style={inputStyle}
              inputMode="numeric"
            />
          </label>

          <button
            onClick={handleBuscar}
            style={primaryBtnStyle(loadingBuscar)}
            disabled={loadingBuscar}
            type="button"
          >
            {loadingBuscar ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </section>

      {/* Editar */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Editar usuário</h2>

        <div style={cardStyle}>
          <strong>{titulo}</strong>

          <div style={{ fontSize: 14, opacity: 0.85 }}>
            <strong>Função:</strong> {buscado ? buscado.funcao : "-"}
          </div>

          <label style={labelStyle}>
            <span>Nome</span>
            <input
              value={editNome}
              onChange={(e) => setEditNome(e.target.value)}
              placeholder="Nome do usuário"
              style={inputStyle}
              disabled={!buscado}
            />
          </label>

          <label style={labelStyle}>
            <span>Email / Login</span>
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              placeholder="email_login"
              style={inputStyle}
              disabled={!buscado}
            />
          </label>

          <label style={labelStyle}>
            <span>Nova senha (opcional)</span>
            <input
              value={editSenha}
              onChange={(e) => setEditSenha(e.target.value)}
              placeholder="Deixe vazio para não alterar"
              style={inputStyle}
              disabled={!buscado}
              type="password"
              minLength={6}
              maxLength={72}
            />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <button
              onClick={handleSalvar}
              style={primaryBtnStyle(saving)}
              disabled={!buscado || saving}
              type="button"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              onClick={handleDeletar}
              style={dangerBtnStyle(deleting)}
              disabled={!buscado || deleting}
              type="button"
            >
              {deleting ? "Excluindo..." : "Excluir usuário"}
            </button>
          </div>
        </div>
      </section>

      {/* Lista */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
          <h2 style={{ marginTop: 0, fontWeight: 600 }}>Usuários do sistema</h2>
          <button
            onClick={carregarUsuarios}
            style={secondaryBtnStyle}
            type="button"
            disabled={loadingUsuarios}
            title="Recarregar"
          >
            {loadingUsuarios ? "Carregando..." : "Recarregar"}
          </button>
        </div>

        {loadingUsuarios ? <p>Carregando usuários...</p> : null}

        {!loadingUsuarios && usuarios.length === 0 ? <p>Nenhum usuário encontrado.</p> : null}

        {!loadingUsuarios && usuarios.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {usuarios.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => carregarUsuarioPorId(u.id)}
                style={{
                  ...cardStyle,
                  cursor: "pointer",
                  textAlign: "left",
                  background: "var(--surface)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{u.nome}</strong>
                  <span style={{ fontSize: 13, opacity: 0.8 }}>ID {u.id}</span>
                </div>

                <div style={{ fontSize: 14, opacity: 0.85 }}>{u.email_login}</div>

                <div style={{ fontSize: 13, opacity: 0.75 }}>
                  Função: <strong>{u.funcao}</strong>
                </div>
              </button>
            ))}
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

function alertStyle(kind: "success" | "error" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  };

  if (kind === "success") return { ...base, borderColor: "#b7e3c5" };
  if (kind === "warn") return { ...base, borderColor: "#f2ddb0" };
  return { ...base, borderColor: "#f3c2c2" };
}

const sectionStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  marginTop: 18,
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

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #ddd",
  background: "var(--surface)",
  cursor: "pointer",
  fontWeight: 600,
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

function dangerBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #d32f2f",
    background: disabled ? "#f5f5f5" : "#d32f2f",
    color: disabled ? "var(--disabled-text)" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}
