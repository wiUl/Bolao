"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/app/components/AuthCard";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <AuthCard title="Entrar">
      <form style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email ou usuário</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </label>

        <button
          type="submit"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            cursor: "pointer",
          }}
        >
          Entrar
        </button>
      </form>

      <p style={{ marginTop: 12 }}>
        Não tem conta? <Link href="/register">Cadastrar</Link>
      </p>
    </AuthCard>
  );
}
