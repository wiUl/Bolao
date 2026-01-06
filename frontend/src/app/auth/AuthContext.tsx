"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/app/api/clients";
import { setupInterceptors } from "@/app/interceptors";
import { clearToken, getToken, setToken } from "@/app/auth/tokenStorage";
import type { LoginRequest } from "@/types/auth";

// O "type" define o formato do que o Context vai disponibilizar
type AuthContextValue = {
  token: string | null;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ✅ Aqui nasce o setTokenState
  const [tokenState, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setupInterceptors();
    setTokenState(getToken()); // carrega token salvo (se existir) ao iniciar
  }, []);

  async function login(data: LoginRequest): Promise<void> {
    const form = new URLSearchParams();
    form.append("username", data.username);
    form.append("password", data.password);

    const res = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    console.log("LOGIN RESPONSE:", res.data);

    // ✅ Ajuste aqui se o seu backend usar outro campo
    const accessToken = res.data?.access_token; // esperado: { access_token: "...", token_type: "bearer" }

    if (!accessToken) {
      throw new Error("Resposta do login não contém access_token.");
    }

    setToken(accessToken);        // salva no localStorage
    setTokenState(accessToken);   // salva no estado do React (atualiza a UI)
  }

  function logout(): void {
    clearToken();
    setTokenState(null);
  }

  const value = useMemo<AuthContextValue>(() => {
    return {
      token: tokenState,
      isAuthenticated: !!tokenState,
      login,
      logout,
    };
  }, [tokenState]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
