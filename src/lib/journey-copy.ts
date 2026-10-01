import type { Locale } from "@/lib/locale";
export const journeyCopy = {
  es: {
    open: "Abrir SaborMX",
    close: "Cerrar",
    title: "SaborMX · Tu asistente",
    notices: "Avisos de tus pedidos",
    read: "Marcar leído",
    chat: "Conversación",
    placeholder: "Pregunta por tu pedido o el menú",
    send: "Enviar",
    thinking: "SaborMX está pensando…",
    error: "No pudimos actualizar el asistente. Inténtalo de nuevo.",
    empty: "Hola, tengo el contexto de tus pedidos. ¿En qué te ayudo?",
    full: "Abrir asistente completo",
    order: "Tu pedido",
    pickupReady: "listo para recoger",
    deliveryReady: "listo para reparto",
    observed: "Estado registrado",
    latest: "Aviso del pedido",
    track: "Ver pedido",
  },
  en: {
    open: "Open SaborMX",
    close: "Close",
    title: "SaborMX · Your assistant",
    notices: "Order updates",
    read: "Mark read",
    chat: "Conversation",
    placeholder: "Ask about your order or the menu",
    send: "Send",
    thinking: "SaborMX is thinking…",
    error: "Could not update the assistant. Please try again.",
    empty: "Hi, I have your order context. How can I help?",
    full: "Open full assistant",
    order: "Your order",
    pickupReady: "ready for pickup",
    deliveryReady: "ready for dispatch",
    observed: "Recorded status",
    latest: "Order update",
    track: "Track order",
  },
  de: {
    open: "SaborMX öffnen",
    close: "Schließen",
    title: "SaborMX · Dein Assistent",
    notices: "Bestellmeldungen",
    read: "Als gelesen markieren",
    chat: "Gespräch",
    placeholder: "Frage zur Bestellung oder Speisekarte",
    send: "Senden",
    thinking: "SaborMX denkt nach…",
    error:
      "Assistent konnte nicht aktualisiert werden. Bitte erneut versuchen.",
    empty: "Hallo, ich kenne deine Bestellungen. Wie kann ich helfen?",
    full: "Vollständigen Assistenten öffnen",
    order: "Deine Bestellung",
    pickupReady: "abholbereit",
    deliveryReady: "bereit für den Versand",
    observed: "Erfasster Status",
    latest: "Bestellmeldung",
    track: "Bestellung ansehen",
  },
};
const names: Record<Locale, Record<string, string>> = {
  es: {
    NUEVO: "recibido",
    CONFIRMADO: "confirmado",
    EN_PREPARACION: "en preparación",
    EN_CAMINO: "en camino",
    ENTREGADO: "entregado",
    CANCELADO: "cancelado",
    NO_PRESENTADO: "no recogido",
  },
  en: {
    NUEVO: "received",
    CONFIRMADO: "confirmed",
    EN_PREPARACION: "being prepared",
    EN_CAMINO: "on the way",
    ENTREGADO: "delivered",
    CANCELADO: "cancelled",
    NO_PRESENTADO: "not collected",
  },
  de: {
    NUEVO: "eingegangen",
    CONFIRMADO: "bestätigt",
    EN_PREPARACION: "in Zubereitung",
    EN_CAMINO: "unterwegs",
    ENTREGADO: "zugestellt",
    CANCELADO: "storniert",
    NO_PRESENTADO: "nicht abgeholt",
  },
};
export function noticeText(
  locale: Locale,
  notice: {
    status: string;
    eventKey?: string;
    order: { publicId: string; type: string };
  },
) {
  const t = journeyCopy[locale];
  if (notice.eventKey?.startsWith("estimate:"))
    return `${t.order} ${notice.order.publicId}: ${locale === "es" ? "estimación actualizada; consulta el seguimiento." : locale === "en" ? "estimate updated; check tracking." : "Zeitschätzung aktualisiert; siehe Bestellverfolgung."}`;
  if (notice.eventKey?.startsWith("delay:"))
    return `${t.order} ${notice.order.publicId}: ${locale === "es" ? "la preparación lleva retraso; consulta el seguimiento." : locale === "en" ? "preparation is delayed; check tracking." : "Zubereitung verzögert; siehe Bestellverfolgung."}`;
  const status =
    notice.status === "LISTO"
      ? notice.order.type === "DELIVERY"
        ? t.deliveryReady
        : t.pickupReady
      : (names[locale][notice.status] ?? notice.status);
  return `${t.order} ${notice.order.publicId}: ${status}.`;
}
