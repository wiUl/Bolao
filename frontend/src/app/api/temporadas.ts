import { api } from "./clients";
import type { Temporada } from "@/app/types/temporada";

export async function listarTemporadas(): Promise<Temporada[]> {
  const res = await api.get<Temporada[]>("/temporadas");
  return res.data;
}
