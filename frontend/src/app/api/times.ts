import { api } from "./clients";
import type { Time, TimeCreate, TimeUpdate } from "@/app/types/time";

// Lista todos os times
export async function listarTimes(): Promise<Time[]> {
  const res = await api.get<Time[]>("/times");
  return res.data;
}

// Busca um time pelo ID
export async function buscarTime(timeId: number): Promise<Time> {
  const res = await api.get<Time>(`/times/${timeId}`);
  return res.data;
}

// Cria um novo time
export async function criarTime(payload: TimeCreate): Promise<Time> {
  const res = await api.post<Time>("/times", payload);
  return res.data;
}

// Atualiza um time existente
export async function atualizarTime(
  timeId: number,
  payload: TimeUpdate
): Promise<Time> {
  const res = await api.put<Time>(`/times/${timeId}`, payload);
  return res.data;
}

// Remove um time
export async function deletarTime(timeId: number): Promise<void> {
  await api.delete(`/times/${timeId}`);
}
