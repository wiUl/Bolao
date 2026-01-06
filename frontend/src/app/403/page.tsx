import Link from "next/link";
import { AuthCard } from "@/app/components/AuthCard";

export default function ForbiddenPage() {
  return (
    <AuthCard title="403">
      <p style={{ textAlign: "center", marginBottom: 20 }}>
        Você não tem permissão para acessar esta página.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        <Link
          href="/app"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Voltar para o app
        </Link>

        <Link
          href="/login"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Ir para login
        </Link>
      </div>
    </AuthCard>
  );
}
