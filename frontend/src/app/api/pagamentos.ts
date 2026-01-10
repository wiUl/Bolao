import { api } from "./clients";
import type { LigaPagamentoResponse, LigaPagamentoUpsert } from "@/app/types/pagamentos";

export async function listarPagamentosLiga(ligaId: number): Promise<LigaPagamentoResponse[]> {
  const res = await api.get<LigaPagamentoResponse[]>(`/pagamentos_liga/${ligaId}`);
  return res.data;
}

export async function upsertPagamentoLiga(
  ligaId: number,
  usuarioId: number,
  body: LigaPagamentoUpsert
): Promise<LigaPagamentoResponse> {
  const res = await api.put<LigaPagamentoResponse>(`/pagamentos_liga/${ligaId}/usuarios/${usuarioId}`, body);
  return res.data;
}
