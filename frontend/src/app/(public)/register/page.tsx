"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/app/components/AuthCard";
import { registerUser } from "@/app/api/users";

export default function RegisterPage() {
  const router = useRouter();

  const [nome, setNome] = useState("");
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setMsg(null);
    setLoading(true);
    setSuccess(false);

    try {
      await registerUser({ nome, email_login: login, senha });

      setSuccess(true);
      setMsg("Cadastro realizado com sucesso! Agora você já pode entrar.");
      setLoading(false);

      // opcional: limpar campos após sucesso
      setNome("");
      setLogin("");
      setSenha("");
    } catch (err) {
      console.error("REGISTER ERROR:", err);
      setSuccess(false);
      setMsg("Erro ao cadastrar usuário. Verifique os dados e tente novamente.");
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Cadastrar">
      {/* Se deu sucesso, mostramos uma "tela de sucesso" no mesmo card */}
      {success ? (
        <div style={{ display: "grid", gap: 12 }}>
          {msg && <p style={{ margin: 0 }}>{msg}</p>}

          <button
            type="button"
            onClick={() => router.push("/login")}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #ccc",
              cursor: "pointer",
            }}
          >
            Ir para login
          </button>

          <p style={{ margin: 0 }}>
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </div>
      ) : (
        <>
          {/* Formulário normal */}
          <form
            onSubmit={(e) => e.preventDefault()}
            style={{ display: "grid", gap: 12 }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <span>Nome</span>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Usuário ou email</span>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span>Senha</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
              />
            </label>

            <button
              type="button"
              onClick={handleRegister}
              disabled={loading}
              style={{
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ccc",
                cursor: "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Cadastrando..." : "Criar conta"}
            </button>

            {msg && <p style={{ margin: 0 }}>{msg}</p>}
          </form>

          <p style={{ marginTop: 12 }}>
            Já tem conta? <Link href="/login">Entrar</Link>
          </p>
        </>
      )}
    </AuthCard>
  );
}
