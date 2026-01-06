"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/app/api/clients";

type MeResponse = {
 id: number;
 nome: string;
 email_login: string;
 funcao: "user" | "admin";
};

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let mounted = true;

    async function run() {
      try {
        const res = await api.get<MeResponse>("/usuarios/me");

        const isAdmin = res.data.funcao === "admin";

        if (!mounted) return;

        if (!isAdmin) {
          setStatus("denied");
          router.replace("/403");
          return;
        }

        setStatus("allowed");
      } catch {
        // Se nem consegue carregar /me, algo está errado com auth (token expirou, etc.)
        if (!mounted) return;
        router.replace("/login");
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [router]);

  if (status !== "allowed") return null;
  return <>{children}</>;
}
