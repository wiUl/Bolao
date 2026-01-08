export type PalpiteLigaJogoItem = {
  usuario_nome: string;
  time_casa: string;
  placar_real_casa: number | null;
  placar_real_fora: number | null;
  time_fora: string;
  data_hora: string | null;
  status: string;
  palpite_casa: number | null;
  palpite_fora: number | null;
  pontos: number | null;
};
