// src/app/auth/isAdmin.ts
import type { User } from "@/app/types/user";


export function isAdmin(user: User | null | undefined): boolean {
  return user?.funcao === "admin";
}
