// frontend/src/app/api/jogos.ts
import { api } from "./clients";
import type { Jogo} from "@/app/types/jogo";


/**
 * =========================
 * TYPES DE PAYLOAD (ENVIO)
 * =========================
 * O backend retorna time_casa/time_fora como OBJETO,
 * mas para criar/atualizar normalmente espera os IDs.
 */

export type JogoCreatePayload = {
  temporada_id: number;
  rodada: number;
  time_casa_id: number;
  time_fora_id: number;
  data_hora?: string | null;
};

export type JogoUpdatePayload = {
  temporada_id?: number;
  rodada?: number;
  time_casa_id?: number;
  time_fora_id?: number;
  data_hora?: string | null;
  status?: string;
};

export type JogoResultadoPayload = {
  gols_casa: number;
  gols_fora: number;
  status?: string; // ex: "finalizado"
};

/**
 * =========================
 * LISTAGEM / CONSULTA
 * =========================
 */

export type ListarJogosParams = {
  temporada_id: number;
  rodada?: number; // se no backend for obrigatório, remova o "?"
};

/**
 * GET /jogos
 * Lista jogos (por temporada e opcionalmente rodada)
 */
export async function listarJogos(
  params: ListarJogosParams
): Promise<Jogo[]> {
  const res = await api.get<Jogo[]>("/jogos", { params });
  return res.data;
}

/**
 * GET /jogos/{jogo_id}
 * Busca um jogo específico
 */
export async function buscarJogo(
  jogoId: number
): Promise<Jogo> {
  const res = await api.get<Jogo>(`/jogos/${jogoId}`);
  return res.data;
}

/**
 * =========================
 * CRUD
 * =========================
 */

/**
 * POST /jogos
 * Cria jogo
 */
export async function criarJogo(
  payload: JogoCreatePayload
): Promise<Jogo> {
  const res = await api.post<Jogo>("/jogos", payload);
  return res.data;
}

/**
 * PUT /jogos/{jogo_id}
 * Atualiza dados do jogo (sem placar)
 */
export async function atualizarJogo(
  jogoId: number,
  payload: JogoUpdatePayload
): Promise<Jogo> {
  const res = await api.put<Jogo>(`/jogos/${jogoId}`, payload);
  return res.data;
}

/**
 * DELETE /jogos/{jogo_id}
 * Exclui jogo
 */
export async function deletarJogo(
  jogoId: number
): Promise<void> {
  await api.delete(`/jogos/${jogoId}`);
}

/**
 * PATCH /jogos/{jogo_id}/resultado
 * Atualiza placar e status
 */
export async function atualizarResultadoJogo(
  jogoId: number,
  payload: JogoResultadoPayload
): Promise<Jogo> {
  const res = await api.patch<Jogo>(
    `/jogos/${jogoId}/resultado`,
    payload
  );
  return res.data;
}

/**
 * GET /jogos/rodada-atual?temporada_id=X
 * Retorna a rodada com jogos mais próximos de hoje.
 */
export async function getRodadaAtual(temporadaId: number): Promise<number> {
  const res = await api.get<{ rodada: number }>("/jogos/rodada-atual", {
    params: { temporada_id: temporadaId },
  });
  return res.data.rodada;
}

export type InfoRodadas = {
  ultima_existente: number;
  ultima_finalizada: number;
  rodada_atual: number;
  default_rodada: number;
};

/**
 * GET /jogos/info-rodadas?temporada_id=X
 * Retorna em uma única chamada:
 *  - ultima_existente : maior rodada com ao menos 1 jogo cadastrado
 *  - ultima_finalizada: maior rodada onde TODOS os jogos estão finalizados
 *  - rodada_atual     : rodada com jogo mais próximo de agora
 *  - default_rodada   : sugestão de rodada para o seletor (última finalizada ou atual)
 */
export async function getInfoRodadas(temporadaId: number): Promise<InfoRodadas> {
  const res = await api.get<InfoRodadas>("/jogos/info-rodadas", {
    params: { temporada_id: temporadaId },
  });
  return res.data;
}