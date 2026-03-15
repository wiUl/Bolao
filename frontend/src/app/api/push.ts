import { api } from "./clients";
 
export async function registrarPushToken(token: string) {
  const { data } = await api.post("/push/register-token", { token });
  return data;
}
 
export async function removerPushToken(token: string) {
  const { data } = await api.post("/push/unregister-token", { token });
  return data;
}
 
export async function reportarErroPush(
  etapa: string,
  erro: unknown,
  contexto: Record<string, unknown> = {}
) {
  try {
    const mensagem =
      erro instanceof Error
        ? `${erro.name}: ${erro.message}`
        : String(erro);
    await api.post("/push/diagnostico", { etapa, erro: mensagem, contexto });
  } catch {
    // silencioso — diagnostico nao deve causar mais erros
  }
}