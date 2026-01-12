import { api } from "./clients";

export async function registrarPushToken(token: string) {
  const { data } = await api.post("/push/register-token", { token });
  return data;
}

export async function removerPushToken(token: string) {
  const { data } = await api.post("/push/unregister-token", { token });
  return data;
}
