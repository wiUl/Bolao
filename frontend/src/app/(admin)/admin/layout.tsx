"use client";

import React from "react";
import { RequireAdmin } from "@/app/auth/RequireAdmin";
import { Topbar } from "@/app/components/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <div>
        <Topbar homeHref="/app" />
        <main>{children}</main>
      </div>
    </RequireAdmin>
  );
}
