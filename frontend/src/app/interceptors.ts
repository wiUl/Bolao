import { api } from "@/app/api/clients";
import { getToken, clearToken } from "@/app/auth/tokenStorage";

export function setupInterceptors(): void {
  api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.response?.status === 401) {
        clearToken();
      }
      return Promise.reject(error);
    }
  );
}
