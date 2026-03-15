"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/api/clients";
import { useAuth } from "@/app/auth/AuthContext";
import type { User } from "@/app/types/user";
import Link from "next/link";
import { getToken } from "firebase/messaging";
import { getMessagingIfSupported } from "@/app/lib/firebase";
import { registrarPushToken, removerPushToken, reportarErroPush } from "@/app/api/push";

type UpdateMePayload = Partial<{
  nome: string;
  email_login: string;
  senha: string;
}>;

type ToastType = "success" | "error" | "info";
type ToastMessage = { type: ToastType; title: string; message: string; show: boolean };

export default function PerfilPage() {
  const router = useRouter();
  const { user, logout, reloadUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [emailLogin, setEmailLogin] = useState("");
  const [senha, setSenha] = useState("");

  const [err, setErr] = useState<string | null>(null);

  // Toast (mesmo do palpites)
  const [toast, setToast] = useState<ToastMessage>({ type: "info", title: "", message: "", show: false });

  const showToast = useCallback((type: ToastType, title: string, message: string) => {
    setToast({ type, title, message, show: true });
    setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 4000);
  }, []);

  // delete flow
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canConfirmDelete = useMemo(() => !deleting, [deleting]);

  // notificações
  const [pushStatus, setPushStatus] = useState<"unknown" | "active" | "inactive">("unknown");
  const [pushLoading, setPushLoading] = useState(false);

  // Detecta estado atual das notificações ao montar
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushStatus("inactive");
      return;
    }
    if (Notification.permission !== "granted") {
      setPushStatus("inactive");
      return;
    }
    // permissão concedida — assume ativo (token pode estar no servidor)
    setPushStatus("active");
  }, []);

  // Carrega dados iniciais
  useEffect(() => {
    let mounted = true;

    async function init() {
      setErr(null);
      try {
        if (user) {
          if (!mounted) return;
          setNome(user.nome ?? "");
          setEmailLogin(user.email_login ?? "");
          setSenha("");
          return;
        }
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
    return () => { mounted = false; };
  }, [user]);

  async function handleSave() {
    setErr(null);
    setSaving(true);

    try {
      const payload: UpdateMePayload = {};
      if (nome.trim().length > 0) payload.nome = nome.trim();
      if (emailLogin.trim().length > 0) payload.email_login = emailLogin.trim();
      if (senha.trim().length > 0) payload.senha = senha;

      if (Object.keys(payload).length === 0) {
        setErr("Preencha ao menos um campo para alterar.");
        return;
      }

      await api.put("/usuarios/me", payload);
      await reloadUser();
      setSenha("");
      showToast("success", "Sucesso!", "Dados atualizados com sucesso.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setErr(extractApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setErr(null);
    setDeleting(true);
    try {
      await api.delete("/usuarios/me");
      logout();
      router.replace("/login");
    } catch (e: any) {
      const apiMsg = e?.response?.data?.detail || e?.response?.data?.message || "Erro ao excluir sua conta.";
      setErr(String(apiMsg));
    } finally {
      setDeleting(false);
    }
  }

  // ── Notificações ─────────────────────────────────────────────────────────
  async function handleAtivarNotificacoes() {
    setPushLoading(true);
    try {
      if (!("Notification" in window)) {
        showToast("error", "Não suportado", "Seu navegador não suporta notificações.");
        return;
      }

      if (isIOS() && !isStandalone()) {
        showToast("info", "iPhone/iPad", "Abra no Safari → Compartilhar → Adicionar à Tela de Início. Depois ative as notificações pelo ícone.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("error", "Permissão negada", "Você bloqueou as notificações neste navegador.");
        setPushStatus("inactive");
        return;
      }

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        showToast("error", "Não suportado", "Push não é suportado neste navegador/dispositivo.");
        setPushStatus("inactive");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
      let token: string;
      try {
        token = await getToken(messaging, { vapidKey });
      } catch (e) {
        await reportarErroPush("getToken", e, { userAgent: navigator.userAgent, permissao: Notification.permission });
        showToast("error", "Erro de token", "Não foi possível obter o token do FCM.");
        return;
      }

      if (!token) {
        await reportarErroPush("getToken", "token vazio", { userAgent: navigator.userAgent });
        showToast("error", "Erro de token", "Token FCM veio vazio.");
        return;
      }

      try {
        await registrarPushToken(token);
      } catch (e) {
        await reportarErroPush("registrarToken", e, { userAgent: navigator.userAgent });
        showToast("error", "Erro no servidor", "Não foi possível registrar o token. Tente novamente.");
        return;
      }

      setPushStatus("active");
      showToast("success", "Ativadas!", "Notificações ativadas com sucesso. 🔔");
    } catch (e: unknown) {
      await reportarErroPush("handleAtivarNotificacoes", e, { userAgent: navigator.userAgent });
      const msg = e instanceof Error ? e.message : String(e);
      showToast("error", "Erro inesperado", msg);
    } finally {
      setPushLoading(false);
    }
  }

  async function handleDesativarNotificacoes() {
    setPushLoading(true);
    try {
      const messaging = await getMessagingIfSupported();
      if (messaging) {
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
        try {
          const token = await getToken(messaging, { vapidKey });
          if (token) await removerPushToken(token);
        } catch {
          // token pode já estar inválido, segue em frente
        }
      }
      setPushStatus("inactive");
      showToast("info", "Desativadas", "Notificações desativadas. 🔕");
    } catch (e: unknown) {
      showToast("error", "Erro", "Não foi possível desativar as notificações.");
    } finally {
      setPushLoading(false);
    }
  }

  function handleTogglePush() {
    if (pushStatus === "active") {
      handleDesativarNotificacoes();
    } else {
      handleAtivarNotificacoes();
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
        <p>Carregando...</p>
      </main>
    );
  }

  const pushAtivo = pushStatus === "active";

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>

      {/* ── Toast (popup igual ao de palpites) ── */}
      {toast.show && (
        <div style={toastContainerStyle}>
          <div style={toastStyle(toast.type)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {getToastIcon(toast.type)} {toast.title}
                </div>
                <div style={{ fontSize: 14, opacity: 0.9 }}>{toast.message}</div>
              </div>
              <button
                onClick={() => setToast((prev) => ({ ...prev, show: false }))}
                style={closeButtonStyle}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <section style={sectionStyle}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
          <h1 style={{ marginTop: 0, fontWeight: 600 }}>Meu Perfil</h1>
          <Link href="/app" style={{ textDecoration: "none", fontWeight: 600 }}>Voltar</Link>
        </div>
        <p style={{ marginTop: 0 }}>Atualize seus dados de acesso e informações pessoais.</p>
      </section>

      {err && (
        <div style={alertStyle("error")}>
          <strong>Erro:</strong> {err}
        </div>
      )}

      {/* ── Dados ── */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Dados</h2>

        <div style={gridStyle}>
          <label style={labelStyle}>
            <span>Nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" style={inputStyle} />
          </label>

          <label style={labelStyle}>
            <span>Login (email_login)</span>
            <input value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="seu_login" style={inputStyle} />
          </label>

          <label style={labelStyle}>
            <span>Nova senha (opcional)</span>
            <input value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Deixe vazio para não alterar" type="password" style={inputStyle} />
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <button onClick={handleSave} disabled={saving} style={primaryBtnStyle(saving)}>
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
        </div>
      </section>

      {/* ── Notificações ── */}
      <section style={sectionStyle}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Notificações</h2>
        <p style={{ marginTop: 0, marginBottom: 16 }}>
          Receba alertas de palpites pendentes antes do início de cada jogo.
        </p>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22 }}>{pushAtivo ? "🔔" : "🔕"}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {pushAtivo ? "Notificações ativadas" : "Notificações desativadas"}
              </div>
              <div style={{ fontSize: 13, opacity: 0.65, marginTop: 2 }}>
                {pushAtivo
                  ? "Você receberá alertas antes dos jogos."
                  : "Ative para não perder nenhum palpite."}
              </div>
            </div>
          </div>

          {/* Toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={pushAtivo}
            onClick={handleTogglePush}
            disabled={pushLoading}
            style={toggleBtnStyle(pushAtivo, pushLoading)}
            title={pushAtivo ? "Desativar notificações" : "Ativar notificações"}
          >
            <span style={toggleThumbStyle(pushAtivo)} />
          </button>
        </div>
      </section>

      {/* ── Zona de perigo ── */}
      <section style={{ ...sectionStyle, borderColor: "#f3c2c2" }}>
        <h2 style={{ marginTop: 0, fontWeight: 600 }}>Excluir</h2>
        <p style={{ marginTop: 0 }}>Excluir sua conta é uma ação <strong>irreversível</strong>.</p>

        {!deleteOpen ? (
          <button onClick={() => setDeleteOpen(true)} style={dangerBtnStyle} type="button">
            Excluir minha conta
          </button>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div style={alertStyle("error")}>
              <strong>Confirmação:</strong> tem certeza que deseja excluir sua conta? Essa ação é <strong>irreversível</strong>.
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button onClick={handleDeleteAccount} disabled={!canConfirmDelete} style={dangerBtnStyle} type="button">
                {deleting ? "Excluindo..." : "Confirmar exclusão"}
              </button>
              <button onClick={() => setDeleteOpen(false)} style={secondaryBtnStyle} type="button">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// ── Helpers push ─────────────────────────────────────────────────────────────
function isIOS(): boolean { return /iPad|iPhone|iPod/.test(navigator.userAgent); }
function isStandalone(): boolean {
  // @ts-expect-error
  const navSA = typeof navigator !== "undefined" && navigator.standalone === true;
  const mql = typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;
  return Boolean(navSA || mql);
}

// ── Toast styles (idênticos ao palpites/page.tsx) ─────────────────────────────
function getToastIcon(type: ToastType): string {
  return type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
}

const toastContainerStyle: React.CSSProperties = {
  position: "fixed",
  top: 20,
  right: 20,
  zIndex: 9999,
  maxWidth: "90vw",
  width: 420,
  animation: "slideInRight 0.3s ease-out",
};

function toastStyle(type: ToastType): React.CSSProperties {
  const backgrounds = {
    success: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    error:   "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    info:    "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  };
  return {
    background: backgrounds[type],
    color: "white",
    padding: "16px 20px",
    borderRadius: 12,
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.2)",
  };
}

const closeButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: 20,
  cursor: "pointer",
  padding: 4,
  lineHeight: 1,
  opacity: 0.8,
};

// ── Toggle styles ─────────────────────────────────────────────────────────────
function toggleBtnStyle(ativo: boolean, disabled: boolean): React.CSSProperties {
  return {
    position: "relative",
    width: 52,
    height: 30,
    borderRadius: 15,
    border: "none",
    background: disabled ? "#ccc" : ativo ? "#667eea" : "#ddd",
    cursor: disabled ? "not-allowed" : "pointer",
    padding: 0,
    flexShrink: 0,
    transition: "background 0.25s",
    opacity: disabled ? 0.6 : 1,
  };
}

function toggleThumbStyle(ativo: boolean): React.CSSProperties {
  return {
    position: "absolute",
    top: 3,
    left: ativo ? 25 : 3,
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "white",
    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
    transition: "left 0.25s",
  };
}

// ── Demais styles ─────────────────────────────────────────────────────────────
function alertStyle(kind: "success" | "error" | "warn"): React.CSSProperties {
  const base: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 12 };
  if (kind === "success") return { ...base, borderColor: "#b7e3c5" };
  if (kind === "error")   return { ...base, borderColor: "#f3c2c2" };
  return { ...base, borderColor: "#f2ddb0" };
}

const sectionStyle: React.CSSProperties = { border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 18 };
const gridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 };
const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const inputStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--foreground)", outline: "none", height: 42 };
const secondaryBtnStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: "var(--surface)", cursor: "pointer" };
function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 10, border: "1px solid #ddd", background: disabled ? "var(--muted)" : "var(--surface)", cursor: disabled ? "not-allowed" : "pointer", fontWeight: 600 };
}
const dangerBtnStyle: React.CSSProperties = { padding: "10px 12px", borderRadius: 10, border: "1px solid #f3c2c2", background: "var(--surface)", cursor: "pointer", fontWeight: 600 };

function extractApiErrorMessage(e: any): string {
  const data = e?.response?.data;
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const msgs = detail.map((x) => (typeof x?.msg === "string" ? x.msg : null)).filter(Boolean);
    if (msgs.length) return msgs.join(" | ");
    return JSON.stringify(detail);
  }
  if (typeof data?.message === "string") return data.message;
  if (typeof data === "string") return data;
  if (data) return JSON.stringify(data);
  return e?.message || "Erro ao atualizar seus dados.";
}