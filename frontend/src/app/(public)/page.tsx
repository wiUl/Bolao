import Link from "next/link";
import { AuthCard } from "@/app/components/AuthCard";

export default function HomePage() {
  return (
    <AuthCard>
      <h1 style={{ marginTop: 0 , textAlign: "center", fontSize: '32px'}}>FutBolão</h1>

      <p style={{ marginBottom: 20 }}>
        Entre para palpitar jogos, acompanhar rankings e evolução por rodada.
      </p>

      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href="/login"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Entrar
        </Link>

        <Link
          href="/register"
          style={{
            padding: 10,
            borderRadius: 8,
            border: "1px solid #ccc",
            textDecoration: "none",
          }}
        >
          Cadastrar
        </Link>
      </div>
    </AuthCard>
  );
}
