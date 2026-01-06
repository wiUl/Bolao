export type RegisterRequest = {
  nome: string;
  email_login: string;
  senha: string;
};

export type User = {
  id: number;
  nome: string;
  email_login: string;
  funcao: "user" | "admin";
};