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

type AuthContextValue = {
  isAuthenticated: boolean;
  user: User | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  reloadUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Lê o campo `exp` (Unix timestamp em segundos) do payload do JWT
 * sem precisar de nenhuma chamada ao servidor.
 * Retorna null se o token for inválido ou não tiver `exp`.
 */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [tokenState, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logoutRef = useRef<() => void>(() => {});
  // Guarda o id do setTimeout para poder cancelá-lo quando necessário
  const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback((): void => {
    clearToken();
    setTokenState(null);
    setUser(null);
    // Cancela o timer pendente para não disparar duas vezes
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  /**
   * Agenda o logout automático para quando o token expirar.
   * Chamado sempre que um novo token é recebido.
   */
  function agendarLogoutAutomatico(token: string): void {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }

    const exp = getTokenExpiry(token);
    if (exp === null) return;

    const agora = Math.floor(Date.now() / 1000);
    const segundosRestantes = exp - agora;

    if (segundosRestantes <= 0) {
      // Já expirou — desloga imediatamente
      logoutRef.current();
      return;
    }

    // Agenda o logout para daqui `segundosRestantes` segundos
    // (máximo de ~24,8 dias para não estourar o limite do setTimeout)
    const ms = Math.min(segundosRestantes * 1000, 2_147_483_647);
    expiryTimerRef.current = setTimeout(() => {
      logoutRef.current();
    }, ms);
  }

  useEffect(() => {
    setupInterceptors(() => logoutRef.current());

    const token = getToken();
    if (token) {
      setTokenState(token);
      agendarLogoutAutomatico(token);
      loadUser();
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpa o timer quando o componente desmonta
  useEffect(() => {
    return () => {
      if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    };
  }, []);

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
    agendarLogoutAutomatico(accessToken);

    await loadUser();
  }

  async function loadUser() {
    try {
      const res = await api.get<User>("/usuarios/me");
      setUser(res.data);
    } catch {
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