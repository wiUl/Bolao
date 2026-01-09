import { api } from "./clients";
import type { Temporada, TemporadaCreate, TemporadaUpdate } from "@/app/types/temporada";

export type ListarTemporadasParams = {
  competicao_id?: number;
  ano?: number;
};

export async function listarTemporadas(params?: ListarTemporadasParams): Promise<Temporada[]> {
  const res = await api.get<Temporada[]>("/temporadas", {params});
  return res.data;
}

export async function buscarTemporada(temporadaId: number): Promise<Temporada> {
  const res = await api.get<Temporada>(`/temporadas/${temporadaId}`);
  return res.data;
}

export async function criarTemporada(payload: TemporadaCreate): Promise<Temporada> {
  const res = await api.post<Temporada>("/temporadas", payload);
  return res.data;
}

export async function atualizarTemporada(
  temporadaId: number,
  payload: TemporadaUpdate
): Promise<Temporada> {
  const res = await api.put<Temporada>(`/temporadas/${temporadaId}`, payload);
  return res.data;
}

export async function deletarTemporada(temporadaId: number): Promise<void> {
  await api.delete(`/temporadas/${temporadaId}`);
}
