"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/api/clients";
import { useAuth } from "@/app/auth/AuthContext";
import type { User } from "@/app/types/user";

type UpdateMePayload = Partial<{
  nome: string;
  email_login: string;
  senha: string;
}>;

export default function PerfilPage() {
  const router = useRouter();
  const { user, logout, reloadUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [emailLogin, setEmailLogin] = useState("");
  const [senha, setSenha] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // delete flow
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canConfirmDelete = useMemo(() => !deleting, [deleting]);
 

  // Carrega dados iniciais do formulário
  useEffect(() => {
    let mounted = true;

    async function init() {
      setErr(null);
      setMsg(null);

      try {
        // Se já temos user no contexto, usamos isso (mais rápido)
        if (user) {
          if (!mounted) return;
          setNome(user.nome ?? "");
          setEmailLogin(user.email_login ?? "");
          setSenha("");
          return;
        }

        // Fallback: busca /usuarios/me
        const res = await api.get<User>("/usuarios/me");
        if (!mounted) return;

        setNome(res.data.nome ?? "");
        setEmailLogin(res.data.email_login ?? "");
        setSenha("");
      } catch {
        if (!mounted) return;
        setErr("Não foi possível carregar seus dados.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!msg) return;

    const timer = setTimeout(() => {
        setMsg(null);
    }, 3500);

    return () => clearTimeout(timer);
  }, [msg]);


    async function handleSave() {
        setErr(null);
        setMsg(null);
        setSaving(true);

        try {
            const payload: UpdateMePayload = {};

            // Só envia se o usuário digitou algo
            if (nome.trim().length > 0) payload.nome = nome.trim();
            if (emailLogin.trim().length > 0) payload.email_login = emailLogin.trim();
            if (senha.trim().length > 0) payload.senha = senha;

            // Se não tem nada pra atualizar, evita request
            if (Object.keys(payload).length === 0) {
            setErr("Preencha ao menos um campo para alterar.");
            return;
            }

            await api.put("/usuarios/me", payload);

            await reloadUser();
            setSenha("");
            setMsg("Dados atualizados com sucesso.");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (e: any) {
            setErr(extractApiErrorMessage(e));
        } finally {
            setSaving(false);
        }
    }


  async function handleDeleteAccount() {
    setErr(null);
    setMsg(null);
    setDeleting(true);

    try {
      await api.delete("/usuarios/me");

      // Após excluir, devemos deslogar e ir para login
      logout();
      router.replace("/login");
    } catch (e: any) {
      const apiMsg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        "Erro ao excluir sua conta.";
      setErr(String(apiMsg));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <p>Carregando...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Meu Perfil</h1>
      <p>Atualize seus dados de acesso e informações pessoais.</p>

      {err ? (
        <div style={alertStyle("error")}>
          <strong>Erro:</strong> {err}
        </div>
      ) : null}

      {msg ? (
        <div
            style={{
            border: "1px solid #b7e3c5",
            borderRadius: 10,
            padding: 12,
            marginTop: 12,
            marginBottom: 12,
            }}
            role="status"
            aria-live="polite"
        >
            <strong>Sucesso:</strong> {msg}
        </div>
    ) : null}


      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0 }}>Dados</h2>

        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>Nome</span>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Login (email_login)</span>
            <input
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              placeholder="seu_login"
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            <span>Nova senha (opcional)</span>
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Deixe vazio para não alterar"
              type="password"
              style={inputStyle}
            />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={primaryBtnStyle(saving)}
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>

          <button
            onClick={() => router.push("/app")}
            style={secondaryBtnStyle}
            type="button"
          >
            Voltar
          </button>
        </div>
      </section>

      <section style={{ ...sectionStyle, borderColor: "#f3c2c2" }}>
        <h2 style={{ marginTop: 0 }}>Zona de perigo</h2>
        <p style={{ marginTop: 0 }}>
          Excluir sua conta é uma ação <strong>irreversível</strong>.
        </p>

        {!deleteOpen ? (
          <button
            onClick={() => setDeleteOpen(true)}
            style={dangerBtnStyle}
            type="button"
          >
            Excluir minha conta
          </button>
        ) : (
            <div style={{ marginTop: 12 }}>
                <div style={alertStyle("warn")}>
                <strong>Confirmação:</strong> tem certeza que deseja excluir sua conta?
                Essa ação é <strong>irreversível</strong>.
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                    onClick={handleDeleteAccount}
                    disabled={!canConfirmDelete}
                    style={dangerBtnStyle}
                    type="button"
                >
                    {deleting ? "Excluindo..." : "Confirmar exclusão"}
                </button>

                <button
                    onClick={() => setDeleteOpen(false)}
                    style={secondaryBtnStyle}
                    type="button"
                >
                    Cancelar
                </button>
                </div>
            </div>
            )}
      </section>
    </main>
  );
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

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  marginTop: 12,
};

const labelStyle: React.CSSProperties = {
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

function extractApiErrorMessage(e: any): string {
  const data = e?.response?.data;

  // FastAPI costuma mandar { detail: "..." } ou { detail: [...] }
  const detail = data?.detail;

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    // exemplos comuns: [{ msg: "...", loc: [...] }, ...]
    const msgs = detail
      .map((x) => (typeof x?.msg === "string" ? x.msg : null))
      .filter(Boolean);
    if (msgs.length) return msgs.join(" | ");
    return JSON.stringify(detail);
  }

  // alguns backends mandam { message: "..." }
  if (typeof data?.message === "string") return data.message;

  // fallback
  if (typeof data === "string") return data;
  if (data) return JSON.stringify(data);

  return e?.message || "Erro ao atualizar seus dados.";
}

