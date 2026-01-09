import type {Time} from "@/app/types/time"

export type Jogo = {
  id: number;
  temporada_id: number;
  rodada: number;
  time_casa: Time;
  time_fora: Time;
  gols_casa: number | null;
  gols_fora: number | null;
  data_hora: string | null
  status: string;
};
