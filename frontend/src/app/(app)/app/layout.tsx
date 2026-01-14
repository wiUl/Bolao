"use client";

import { Topbar } from "@/app/components/Topbar";
import { PushBootstrap } from "@/app/components/PushBootstrap";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PushBootstrap />
      <Topbar homeHref="/app" />
      <main>{children}</main>
    </div>
  );
}
