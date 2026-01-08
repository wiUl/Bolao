import { api } from "./clients";
import type { Competicao } from "@/app/types/competicao";

export async function listarCompeticoes(): Promise<Competicao[]> {
  const res = await api.get<Competicao[]>("/competicoes");
  return res.data;
}
