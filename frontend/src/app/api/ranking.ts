import { api } from "./clients";
import type { RankingGeralItem, RankingRodadaItem } from "@/app/types/ranking";

export async function getRankingGeral(ligaId: number): Promise<RankingGeralItem[]> {
  const res = await api.get<RankingGeralItem[]>(`/servicos/${ligaId}/ranking`);
  return res.data;
}

export async function getRankingPorRodada(
  ligaId: number,
  rodada: number
): Promise<RankingRodadaItem[]> {
  const res = await api.get<RankingRodadaItem[]>(
    `/servicos/${ligaId}/${rodada}/ranking_por_rodada`
  );
  return res.data;
}
