"use client";

import { useState } from "react";
import { getToken } from "firebase/messaging";
import { getMessagingIfSupported } from "@/app/lib/firebase";
import { registrarPushToken } from "@/app/api/push";



export function EnablePushButton() {
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function showMsg(text: string, timeout = 3000) {
    setMsg(text);
    setTimeout(() => {
      setMsg(null);
    }, timeout);
  }

  async function handleEnable() {
    setMsg(null);
    setLoading(true);

    try {
      if (!("Notification" in window)) {
        showMsg("Seu navegador não suporta notificações.", 4000);
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showMsg("Permissão negada.", 4000);
        return;
      }

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        showMsg("Push não suportado neste navegador/dispositivo.", 4000);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!;
      const token = await getToken(messaging, { vapidKey });

      if (!token) {
        showMsg("Não foi possível obter token do FCM.", 4000);
        return;
      }

      if (!vapidKey) {
        alert("VAPID key não configurada (NEXT_PUBLIC_FIREBASE_VAPID_KEY).");
        return;
      }

      await registrarPushToken(token);
      showMsg("Notificações ativadas ✅", 3000);
    } catch (e: any) {
      console.error("ENABLE PUSH ERROR:",e);
      showMsg("Erro ao ativar notificações.", 4000);  
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
      type="button"
      onClick={handleEnable}
      disabled={loading || enabled}
      className="
        px-3 py-2
        text-sm font-medium
        rounded-md
        border
        border-gray-300
        bg-white
        cursor-pointer
        disabled:opacity-50
        disabled:cursor-not-allowed
      "
    >
      {enabled ? "Notificações ativadas" : loading ? "Ativando..." : "Ativar notificações"}
    </button>
      {msg && <small>{msg}</small>}
    </div>
  );
}


