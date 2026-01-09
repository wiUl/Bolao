// frontend/src/app/api/times.ts
import { api } from "./clients";
import type { Time } from "@/app/types/time";

/**
 * =========================
 * TYPES DE PAYLOAD (ENVIO)
 * =========================
 * O backend deve aceitar nome e sigla no create/update.
 */

export type TimeCreatePayload = {
  nome: string;
  sigla: string;
};

export type TimeUpdatePayload = {
  nome?: string;
  sigla?: string;
};

/**
 * =========================
 * QUERIES
 * =========================
 */

/** GET /times - Lista times */
export async function listarTimes(): Promise<Time[]> {
  const res = await api.get<Time[]>("/times");
  return res.data;
}

/** GET /times/{time_id} - Busca um time */
export async function buscarTime(timeId: number): Promise<Time> {
  const res = await api.get<Time>(`/times/${timeId}`);
  return res.data;
}

/**
 * =========================
 * CRUD
 * =========================
 */

/** POST /times - Cria time */
export async function criarTime(payload: TimeCreatePayload): Promise<Time> {
  const res = await api.post<Time>("/times", payload);
  return res.data;
}

/** PUT /times/{time_id} - Atualiza time */
export async function atualizarTime(timeId: number, payload: TimeUpdatePayload): Promise<Time> {
  const res = await api.put<Time>(`/times/${timeId}`, payload);
  return res.data;
}

/** DELETE /times/{time_id} - Exclui time */
export async function deletarTime(timeId: number): Promise<void> {
  await api.delete(`/times/${timeId}`);
}
