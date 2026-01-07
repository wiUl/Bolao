export type LigaRole = "dono" | "admin_liga" | "membro";

export type LigaMembroComUsuario = {
  id: number;
  liga_id: number;
  usuario_id: number;
  nome: string;
  papel: LigaRole;
  data_ingresso: string;
};

export type LigaMembroUpdateRequest = {
  papel: Exclude<LigaRole, "dono">; // backend não permite promover para dono
};

export type SairLigaRequest = {
  novo_dono_usuario_id?: number;
};
