"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";

export default function AppHomePage() {
  const { user } = useAuth();

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>
        Olá{user?.nome ? `, ${user.nome}` : ""} 👋
      </h1>

      <p>
        Bem-vindo ao Bolão. Aqui você pode gerenciar suas ligas,
        palpitar jogos e acompanhar rankings.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>O que você quer fazer?</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
            marginTop: 16,
          }}
        >
          <Link href="/app/ligas" style={cardStyle}>
            <strong>Minhas Ligas</strong>
            <span>Ver ligas que você participa</span>
          </Link>

          <Link href="/app/ligas" style={cardStyle}>
            <strong>Criar ou entrar em liga</strong>
            <span>Criar uma nova liga ou entrar por convite</span>
          </Link>

          <Link href="/app/perfil" style={cardStyle}>
            <strong>Meu Perfil</strong>
            <span>Editar seus dados</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

const cardStyle: React.CSSProperties = {
  border: "1px solid #ddd",
  borderRadius: 12,
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  textDecoration: "none",
  color: "inherit",
};
