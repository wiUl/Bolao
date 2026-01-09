import { api } from "./clients";
import type { PontuacaoAcumuladaItem } from "@/app/types/pontuacao";

/**
 * Minha pontuação acumulada ao longo das rodadas.
 * Backend (pelo seu código) usa query params:
 * - usuario_nome
 * - rodada (opcional)
 */
export async function getPontuacaoAcumuladaUsuario(
  ligaId: number,
  usuarioNome: string,
  rodada: number
): Promise<PontuacaoAcumuladaItem[]> {
  const res = await api.get<PontuacaoAcumuladaItem[]>(
    `/servicos/${ligaId}/pontuacao_acumulada`,
    { params: { usuario_nome: usuarioNome, rodada } }
  );

  return res.data;
}

/**
 * (Deixa pronto pro próximo passo)
 * Pontuação acumulada de todos os usuários.
 */
export async function getPontuacaoAcumuladaTodos(
  ligaId: number,
  rodada: number
): Promise<PontuacaoAcumuladaItem[]> {
  const res = await api.get<PontuacaoAcumuladaItem[]>(
    `/servicos/${ligaId}/pontuacao_acumulada/todos`,
    { params: { rodada } }
  );

  return res.data;
}
