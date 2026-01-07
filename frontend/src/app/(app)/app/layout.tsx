"use client";

import Link from "next/link";
import { useAuth } from "@/app/auth/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div>
      <header
        style={{
          padding: "12px 24px",
          borderBottom: "1px solid #eee",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/app" style={{ textDecoration: "none", color: "inherit" }}>
          <strong>Bolão</strong>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user?.nome ? <span>{user.nome}</span> : null}

          <button
            onClick={logout}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "white",
              cursor: "pointer",
            }}
          >
            Sair
          </button>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
