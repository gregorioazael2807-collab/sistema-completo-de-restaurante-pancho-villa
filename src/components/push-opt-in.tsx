"use client";
import { useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";
export function PushOptIn({ locale }: { locale: Locale }) {
  const [key, setKey] = useState<string | null>(null),
    [state, setState] = useState<"idle" | "on" | "error">("idle");
  useEffect(() => {
    void fetch("/api/push/subscription", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => setKey(v?.publicKey ?? null))
      .catch(() => {});
  }, []);
  if (!key) return null;
  async function enable() {
    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !isSecureContext ||
        (await Notification.requestPermission()) !== "granted"
      )
        throw Error();
      const registration =
        await navigator.serviceWorker.register("/pancho-push-sw.js");
      await navigator.serviceWorker.ready;
      const padded = key!.replace(/-/g, "+").replace(/_/g, "/");
      const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: bytes,
        }));
      const r = await fetch("/api/push/subscription", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!r.ok) throw Error();
      setState("on");
    } catch {
      setState("error");
    }
  }
  async function disable() {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const r = await fetch("/api/push/subscription", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        if (!r.ok) throw Error();
        await subscription.unsubscribe();
      }
      setState("idle");
    } catch {
      setState("error");
    }
  }
  return (
    <div style={{ padding: 20 }}>
      <button
        type="button"
        onClick={() => void (state === "on" ? disable() : enable())}
      >
        {state === "on"
          ? locale === "es"
            ? "Desactivar notificaciones"
            : locale === "en"
              ? "Disable notifications"
              : "Benachrichtigungen deaktivieren"
          : locale === "es"
            ? "Activar notificaciones de pedidos"
            : locale === "en"
              ? "Enable order notifications"
              : "Bestellmeldungen aktivieren"}
      </button>
      {state === "error" && (
        <p role="alert">
          {locale === "es"
            ? "No se pudieron activar las notificaciones."
            : locale === "en"
              ? "Could not enable notifications."
              : "Benachrichtigungen konnten nicht aktiviert werden."}
        </p>
      )}
    </div>
  );
}
