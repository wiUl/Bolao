"use client";

import { RequireAuth } from "@/app/auth/RequireAuth";
import { Topbar } from "@/app/components/Topbar";
import { PushBootstrap } from "@/app/components/PushBootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
    <div>
      <PushBootstrap />
      <Topbar homeHref="/app" />
      <main>{children}</main>
    </div>
    </RequireAuth>
  );
}
