// src/app/api/competicoes.ts
import { api } from "./clients";
import type { Competicao } from "@/app/types/competicao";

export type CompeticaoCreatePayload = {
  nome: string;
  pais: string;
  tipo: string;
};

export type CompeticaoUpdatePayload = {
  nome?: string;
  pais?: string;
  tipo?: string;
};

export async function listarCompeticoes(): Promise<Competicao[]> {
  const res = await api.get<Competicao[]>("/competicoes");
  return res.data;
}

export async function criarCompeticao(payload: CompeticaoCreatePayload): Promise<Competicao> {
  const res = await api.post<Competicao>("/competicoes", payload);
  return res.data;
}

export async function buscarCompeticao(id: number): Promise<Competicao> {
  const res = await api.get<Competicao>(`/competicoes/${id}`);
  return res.data;
}

export async function atualizarCompeticao(id: number, payload: CompeticaoUpdatePayload): Promise<Competicao> {
  const res = await api.put<Competicao>(`/competicoes/${id}`, payload);
  return res.data;
}

export async function deletarCompeticao(id: number): Promise<void> {
  await api.delete(`/competicoes/${id}`);
}
