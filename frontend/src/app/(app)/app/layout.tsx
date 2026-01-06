"use client";

import { RequireAuth } from "@/app/auth/RequireAuth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      {/* aqui entra seu Topbar/Menu do usuário */}
      <div style={{ minHeight: "100vh" }}>{children}</div>
    </RequireAuth>
  );
}