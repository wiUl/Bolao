"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/app/components/AuthCard";
import { useAuth } from "@/app/auth/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // impede recarregar a página
    setMsg(null);
    setLoading(true);

    try {
      await login({ username: email, password }); // backend espera username/password
      router.replace("/app"); // manda para a home do usuário
    } catch (err) {
      setMsg("Falha no login. Verifique usuário e senha.");
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Entrar">
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email ou usuário</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Digite seu email ou usuário"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite sua senha"
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        {msg && <p style={{ margin: 0 }}>{msg}</p>}
      </form>

      <p style={{ marginTop: 12 }}>
        Não tem conta? <Link href="/register">Cadastrar</Link>
      </p>
    </AuthCard>
  );
}
