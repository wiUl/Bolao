import { api } from "./clients";
import type { LigaCobrancaMesResponse } from "@/app/types/pagamentos";

export async function listarCobrancaMeses(
  ligaId: number,
  somenteAtivos: boolean = true
): Promise<LigaCobrancaMesResponse[]> {
  const res = await api.get<LigaCobrancaMesResponse[]>(`/cobranca_meses/${ligaId}`, {
    params: { somente_ativos: somenteAtivos },
  });
  return res.data;
}

export async function upsertCobrancaMes(
  ligaId: number,
  mes: number,
  ativo: boolean
): Promise<LigaCobrancaMesResponse> {
  const res = await api.put<LigaCobrancaMesResponse>(`/cobranca_meses/${ligaId}`, { mes, ativo });
  return res.data;
}
