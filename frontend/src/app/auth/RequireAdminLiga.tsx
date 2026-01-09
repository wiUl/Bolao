"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/auth/AuthContext";
import { listarMembrosLiga } from "@/app/api/membroLigas";
import type { LigaMembroComUsuario } from "@/app/types/ligaMembro";
import { AuthCard } from "@/app/components/AuthCard";

export function RequireAdminLiga({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const ligaId = Number(params?.ligaId);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.id) {
        router.replace("/login");
        return;
      }

      try {
        const membros: LigaMembroComUsuario[] = await listarMembrosLiga(ligaId);

        const meu = membros.find((m) => m.usuario_id === user.id);
        const role = (meu?.papel ?? "").toLowerCase();

        setAllowed(role === "admin_liga");
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [ligaId, user?.id, router]);

  if (loading) {
    return (
      <AuthCard title="Pagamentos">
        <p style={{ textAlign: "center" }}>Carregando...</p>
      </AuthCard>
    );
  }

  if (!allowed) {
    return (
      <AuthCard title="Acesso restrito">
        <p style={{ textAlign: "center" }}>
          Apenas o <strong>admin da liga</strong> pode acessar esta tela.
        </p>
      </AuthCard>
    );
  }

  return <>{children}</>;
}
