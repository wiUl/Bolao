"use client";

import { Topbar } from "@/app/components/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Topbar homeHref="/app" />
      <main>{children}</main>
    </div>
  );
}
