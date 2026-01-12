"use client";

import { useState } from "react";
import { getToken } from "firebase/messaging";
import { getMessagingIfSupported } from "@/app/lib/firebase";
import { registrarPushToken } from "@/app/api/push";

export function EnablePushButton() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleEnable() {
    setMsg(null);
    setLoading(true);

    try {
      if (!("Notification" in window)) {
        setMsg("Seu navegador não suporta notificações.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg("Permissão negada.");
        return;
      }

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        setMsg("Push não suportado neste navegador/dispositivo.");
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
      const token = await getToken(messaging, { vapidKey });

      if (!token) {
        setMsg("Não foi possível obter token do FCM.");
        return;
      }

      await registrarPushToken(token);
      setMsg("Notificações ativadas ✅");
    } catch (e: any) {
      console.error(e);
      setMsg("Erro ao ativar notificações.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button onClick={handleEnable} disabled={loading}>
        {loading ? "Ativando..." : "Ativar notificações"}
      </button>
      {msg && <small>{msg}</small>}
    </div>
  );
}
