"use client";

import { useEffect } from "react";

export function PushBootstrap() {
  useEffect(() => {
    // registra SW do FCM (necessário para background push)
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/firebase-messaging-sw.js")
      .catch((err) => console.error("SW register failed:", err));
  }, []);

  return null;
}
