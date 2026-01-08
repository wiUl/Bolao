import { api } from "./clients";
import type { Temporada } from "@/app/types/temporada";

export async function listarTemporadas(params?: { competicao_id?: number }): Promise<Temporada[]> {
  const res = await api.get<Temporada[]>("/temporadas", { params });
  return res.data;
}

