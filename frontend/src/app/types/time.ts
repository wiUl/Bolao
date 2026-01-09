export type Time = {
  id: number;
  nome: string;
  sigla: string | null;
  escudo_url: string | null;
};

export type TimeCreate = {
  nome: string;
  sigla?: string | null;
  escudo_url?: string | null;
};

export type TimeUpdate = {
  nome?: string;
  sigla?: string | null;
  escudo_url?: string | null;
};
