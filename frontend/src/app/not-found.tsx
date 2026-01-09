"use client";

import Link from "next/link";
import { AuthCard } from "@/app/components/AuthCard";
import { useAuth } from "@/app/auth/AuthContext";

export default function NotFound() {
  const { user } = useAuth();
  const href = user ? "/app" : "/";

  return (
    <AuthCard title="404">
      <p style={{ textAlign: "center", marginBottom: 20 }}>
        Página não encontrada.
      </p>

      <Link
        href={href}
        style={{
          padding: 10,
          borderRadius: 8,
          border: "1px solid #ccc",
          textDecoration: "none",
          display: "block",
          textAlign: "center",
        }}
      >
        Voltar para a página inicial
      </Link>
    </AuthCard>
  );
}
