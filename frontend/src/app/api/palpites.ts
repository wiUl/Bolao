import { api } from "./clients";
import type { MeuPalpiteRodadaItem, PalpiteCreate } from "@/app/types/palpite";

export async function listarMeusPalpitesNaRodada(
  ligaId: number,
  rodada: number
): Promise<MeuPalpiteRodadaItem[]> {
  const res = await api.get<MeuPalpiteRodadaItem[]>(
    `/palpites/${ligaId}/rodadas/${rodada}/usuarios/me/palpites`
  );
  return res.data;
}

export async function upsertMeuPalpite(
  ligaId: number,
  jogoId: number,
  body: PalpiteCreate
): Promise<void> {
  await api.put(`/palpites/ligas/${ligaId}/jogos/${jogoId}/meu`, body);
}

export async function deletarMeuPalpite(ligaId: number, jogoId: number): Promise<void> {
  await api.delete(`/palpites/ligas/${ligaId}/jogos/${jogoId}/meu`);
}
