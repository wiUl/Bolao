export type MeuPalpiteRodadaItem = {
  jogo_id: number;
  time_casa: string;
  placar_real_casa: number | null;
  placar_real_fora: number | null;
  time_fora: string;
  data_hora: string;
  status: string;
  palpite_casa: number | null;
  palpite_fora: number | null;
  pontos: number | null;
};

export type PalpiteCreate = {
  placar_casa: number;
  placar_fora: number;
};
