export type LigaCobrancaMesResponse = {
  id: number;
  liga_id: number;
  mes: number;
  ativo: boolean;
  updated_at: string;
};

export type LigaPagamentoResponse = {
  id: number;
  liga_id: number;
  usuario_id: number;
  mes: number;
  pago: boolean;
  updated_at: string;
  updated_by?: number | null;
};

export type LigaPagamentoUpsert = {
  mes: number;
  pago: boolean;
};
