"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "@/app/api/clients";
import { setupInterceptors } from "@/app/interceptors";
import { clearToken, getToken, setToken } from "@/app/auth/tokenStorage";
import type { LoginRequest } from "@/app/types/auth";
import type { User } from "@/app/types/user";

/**
 * O que o AuthContext disponibiliza para o app inteiro
 */
type AuthContextValue = {
  isAuthenticated: boolean;
  user: User | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * 1️⃣ Inicialização do app
   * - configura interceptors
   * - carrega token salvo
   * - se existir token, carrega o usuário
   */
  useEffect(() => {
    setupInterceptors();

    const token = getToken();
    if (token) {
      setTokenState(token);
      loadUser(); // 🔑 carrega /usuarios/me
    } else {
      setLoading(false);
    }
  }, []);

  /**
   * 2️⃣ Login
   * - chama /auth/login
   * - salva token
   * - carrega usuário em seguida
   */
  async function login(data: LoginRequest): Promise<void> {
    const form = new URLSearchParams();
    form.append("username", data.username);
    form.append("password", data.password);

    const res = await api.post("/auth/login", form, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    const accessToken = res.data?.access_token;
    if (!accessToken) {
      throw new Error("Resposta do login não contém access_token.");
    }

    setToken(accessToken);
    setTokenState(accessToken);

    await loadUser(); // 🔑 AQUI o usuário é carregado
  }

  /**
   * 3️⃣ Carrega dados do usuário autenticado
   * - endpoint protegido
   * - depende do token já estar configurado
   */
  async function loadUser() {
    try {
      const res = await api.get<User>("/usuarios/me");
      setUser(res.data);
    } catch {
      // token inválido ou expirado
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  /**
   * 4️⃣ Logout
   */
  function logout(): void {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  /**
   * 5️⃣ Valor exposto pelo contexto
   */
  const value = useMemo<AuthContextValue>(() => {
    return {
      isAuthenticated: !!tokenState,
      user,
      login,
      logout,
    };
  }, [tokenState, user]);

  // Evita renderizar o app antes de saber se está autenticado
  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  }
  return ctx;
}
