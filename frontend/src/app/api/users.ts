import { api } from "./clients";
import type { RegisterRequest } from "@/types/user";

// Função que chama o backend
export async function registerUser(data: RegisterRequest): Promise<void> {
  await api.post("/usuarios/", data);
}
