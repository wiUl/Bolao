import { api } from "./clients";
import type { Jogo } from "@/app/types/jogo";

export async function listarJogos(params: {
  temporada_id: number;
  rodada: number;
}): Promise<Jogo[]> {
  const res = await api.get<Jogo[]>("/jogos", { params });
  return res.data;
}
