"use client";

import { RequireAuth } from "@/app/auth/RequireAuth";
import { Topbar } from "@/app/components/Topbar";
import { PushBootstrap } from "@/app/components/PushBootstrap";
import { Metadata } from "next";

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

export const metadata: Metadata = {
  title: "FutBolão",
  description: "Crie ligas e dê seus palpites",
  appleWebApp: {
    capable: true,
    title: "FutBolão",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/favicon.ico",
  },
};
