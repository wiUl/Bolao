import { api } from "./clients";
import type {
  LigaMembroComUsuario,
  LigaMembroUpdateRequest,
  SairLigaRequest,
} from "@/app/types/ligaMembro";

export async function listarMembrosLiga(ligaId: number): Promise<LigaMembroComUsuario[]> {
  const res = await api.get<LigaMembroComUsuario[]>(`/membro_ligas/${ligaId}/membros`);
  return res.data;
}

export async function alterarPapelMembro(
  ligaId: number,
  usuarioId: number,
  body: LigaMembroUpdateRequest
): Promise<void> {
  await api.put(`/membro_ligas/${ligaId}/membros/${usuarioId}/papel`, body);
}

export async function removerMembroLiga(ligaId: number, usuarioId: number): Promise<void> {
  await api.delete(`/membro_ligas/${ligaId}/membros/${usuarioId}`);
}

export async function sairDaLiga(ligaId: number, body?: SairLigaRequest): Promise<void> {
  // FastAPI aceita body em DELETE (e seu backend usa isso quando o dono sai)
  await api.delete(`/membro_ligas/${ligaId}/membros/me/sair`, { data: body ?? null });
}
