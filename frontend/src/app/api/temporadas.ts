import { api } from "./clients";
import type { Temporada } from "@/app/types/temporada";

export async function listarTemporadas(params?: { Temporada_id?: number }): Promise<Temporada[]> {
  const res = await api.get<Temporada[]>("/temporadas", { params });
  return res.data;
}

export async function criarTemporada(payload: { nome: string }): Promise<Temporada> {
  const res = await api.post<Temporada>("/temporadas", payload);
  return res.data;
}

export async function buscarTemporada(id: number): Promise<Temporada> {
  const res = await api.get<Temporada>(`/temporadas/${id}`)
  return res.data
}

export async function atualizarTemporada(id: number, payload: { nome: string }): Promise<Temporada> {
  const res = await api.put<Temporada>(`/temporadas/${id}`, payload);
  return res.data;
}

export async function deletarTemporada(id: number): Promise<void> {
  await api.delete(`/temporadas/${id}`);
}
