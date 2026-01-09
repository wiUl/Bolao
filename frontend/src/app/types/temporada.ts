export type Temporada = {
  id: number;
  competicao_id: number;
  ano: number;
  data_inicio: string | null;
  data_fim: string | null;
  status: string;
};

export type TemporadaCreate = {
  competicao_id: number;
  ano: number;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string;
};

export type TemporadaUpdate = {
  competicao_id?: number;
  ano?: number;
  data_inicio?: string | null;
  data_fim?: string | null;
  status?: string;
};
