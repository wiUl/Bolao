import { api } from "./clients";
import type { PontuacaoAcumuladaItem } from "@/app/types/pontuacao";

/**
 * Resposta no formato "series" para o comparativo da liga:
 * - max_rodada: última rodada considerada
 * - series: uma série por usuário, com o array de pontos acumulados por rodada
 */
export type SerieLigaResponse = {
  max_rodada: number;
  series: { nome: string; data: number[] }[];
};

/**
 * Minha pontuação acumulada ao longo das rodadas.
 * Backend usa query params:
 * - usuario_nome
 * - rodada
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
 * Pontuação acumulada de todos os usuários.
 * - format="flat"   -> retorna PontuacaoAcumuladaItem[]
 * - format="series" -> retorna SerieLigaResponse
 */

// overloads (pra TS inferir certinho)
export async function getPontuacaoAcumuladaTodos(
  ligaId: number,
  rodada: number,
  format?: "flat"
): Promise<PontuacaoAcumuladaItem[]>;

export async function getPontuacaoAcumuladaTodos(
  ligaId: number,
  rodada: number,
  format: "series"
): Promise<SerieLigaResponse>;

// implementação
export async function getPontuacaoAcumuladaTodos(
  ligaId: number,
  rodada: number,
  format: "flat" | "series" = "flat"
): Promise<PontuacaoAcumuladaItem[] | SerieLigaResponse> {
  // não coloca generic fixo no api.get, porque o retorno muda conforme format
  const res = await api.get(
    `/servicos/${ligaId}/pontuacao_acumulada/todos`,
    { params: { rodada, format } }
  );

  return res.data;
}
