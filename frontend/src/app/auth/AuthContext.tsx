"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { api } from "@/app/api/clients";
import { setupInterceptors } from "@/app/interceptors";
import { clearToken, getToken, setToken } from "@/app/auth/tokenStorage";
import type { LoginRequest } from "@/app/types/auth";
import type { User } from "@/app/types/user";
import { useRouter } from "next/navigation";

/**
 * O que o AuthContext disponibiliza para o app inteiro
 */
type AuthContextValue = {
  isAuthenticated: boolean;
  user: User | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Ref para o logout — permite que o interceptor chame sempre a versão atual
  // sem criar dependência circular no useEffect de inicialização.
  const logoutRef = useRef<() => void>(() => {});

  const logout = useCallback((): void => {
    clearToken();
    setTokenState(null);
    setUser(null);
    router.replace("/login");
  }, [router]);

  // Mantém a ref sempre atualizada
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  /**
   * 1️⃣ Inicialização — configura interceptors passando logout via ref
   */
  useEffect(() => {
    setupInterceptors(() => logoutRef.current());

    const token = getToken();
    if (token) {
      setTokenState(token);
      loadUser();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * 2️⃣ Login
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

    await loadUser();
  }

  /**
   * 3️⃣ Carrega dados do usuário autenticado
   */
  async function loadUser() {
    try {
      const res = await api.get<User>("/usuarios/me");
      setUser(res.data);
    } catch {
      // token inválido ou expirado — o interceptor já fez clearToken,
      // mas garantimos a limpeza do estado aqui também
      clearToken();
      setTokenState(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function reloadUser(): Promise<void> {
    setLoading(true);
    await loadUser();
  }

  /**
   * 4️⃣ Valor exposto pelo contexto
   */
  const value = useMemo<AuthContextValue>(
    () => ({ isAuthenticated: !!tokenState, user, login, logout, reloadUser }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokenState, user, logout]
  );

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