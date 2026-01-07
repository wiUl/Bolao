export type Liga = {
  id: number;
  nome: string;
  temporada_id: number;
  codigo_convite: string;
  id_dono: number;
  data_criacao: string; // vem como ISO (datetime)
};

export type LigaCreateRequest = {
  nome: string;
  temporada_id: number;
};

export type LigaEntrarRequest = {
  codigo_convite: string;
};
