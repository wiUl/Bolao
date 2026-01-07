import { api } from "./clients";
import type { Liga, LigaCreateRequest, LigaEntrarRequest } from "@/app/types/liga";

export async function listarMinhasLigas(temporadaId?: number): Promise<Liga[]> {
  const res = await api.get<Liga[]>("/ligas/minhas_ligas", {
    params: temporadaId ? { temporada_id: temporadaId } : undefined,
  });
  return res.data;
}

export async function criarLiga(data: LigaCreateRequest): Promise<Liga> {
  const res = await api.post<Liga>("/ligas/", data);
  return res.data;
}

export async function entrarNaLiga(data: LigaEntrarRequest): Promise<Liga> {
  const res = await api.post<Liga>("/ligas/entrar", data);
  return res.data;
}

export async function atualizarLiga(
  ligaId: number,
  data: { nome?: string }
) {
  if (!Number.isInteger(ligaId)) {
    throw new Error("ligaId inválido ao atualizar liga.");
  }

  return api.put(`/ligas/${ligaId}`, data);
}

