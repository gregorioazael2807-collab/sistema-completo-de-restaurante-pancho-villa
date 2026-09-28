import { Resend } from "resend";
import { db } from "@/lib/db";

const statusNames: Record<string, Record<string, string>> = {
  es: { NUEVO: "recibido", CONFIRMADO: "confirmado", EN_PREPARACION: "en preparación", LISTO: "listo para recoger", EN_CAMINO: "en camino", ENTREGADO: "entregado", CANCELADO: "cancelado", NO_PRESENTADO: "no recogido" },
  en: { NUEVO: "received", CONFIRMADO: "confirmed", EN_PREPARACION: "being prepared", LISTO: "ready for pickup", EN_CAMINO: "on its way", ENTREGADO: "delivered", CANCELADO: "cancelled", NO_PRESENTADO: "not collected" },
  de: { NUEVO: "eingegangen", CONFIRMADO: "bestätigt", EN_PREPARACION: "in Zubereitung", LISTO: "abholbereit", EN_CAMINO: "unterwegs", ENTREGADO: "zugestellt", CANCELADO: "storniert", NO_PRESENTADO: "nicht abgeholt" },
};

function emailContent(locale: string, publicId: string | undefined, status?: string, resetUrl?: string) {
  const language = locale === "en" || locale === "de" ? locale : "es";
  if (resetUrl) {
    const title = language === "en" ? "Reset your password" : language === "de" ? "Passwort zurücksetzen" : "Restablece tu contraseña";
    const button = language === "en" ? "Choose a new password" : language === "de" ? "Neues Passwort festlegen" : "Crear nueva contraseña";
    const note = language === "en" ? "This secure link expires in 30 minutes." : language === "de" ? "Dieser sichere Link läuft in 30 Minuten ab." : "Este enlace seguro caduca en 30 minutos.";
    return { subject: `${title} · Pancho Villa`, html: `<div style="font-family:Arial,sans-serif;color:#262920;max-width:560px;margin:32px auto;padding:28px;border:1px solid #e8e0d4;border-radius:16px"><p style="color:#c85b40;font-size:12px;font-weight:bold;letter-spacing:2px">PANCHO VILLA</p><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:500">${title}</h1><p>${note}</p><a href="${resetUrl}" style="display:inline-block;margin-top:12px;padding:13px 18px;border-radius:8px;background:#234c3d;color:white;text-decoration:none">${button}</a></div>` };
  }
  const phrase = status ? statusNames[language][status] ?? status : null;
  const title = language === "en" ? status ? `Your order is ${phrase}` : "We received your order" : language === "de" ? status ? `Deine Bestellung ist ${phrase}` : "Wir haben deine Bestellung erhalten" : status ? `Tu pedido está ${phrase}` : "Hemos recibido tu pedido";
  const intro = language === "en" ? `Order ${publicId}` : language === "de" ? `Bestellung ${publicId}` : `Pedido ${publicId}`;
  const button = language === "en" ? "Track order" : language === "de" ? "Bestellung verfolgen" : "Ver estado del pedido";
  const href = `${process.env.NEXTAUTH_URL ?? "http://localhost:3004"}/pedido/${encodeURIComponent(publicId ?? "")}`;
  return { subject: `${title} · Pancho Villa`, html: `<div style="font-family:Arial,sans-serif;color:#262920;max-width:560px;margin:32px auto;padding:28px;border:1px solid #e8e0d4;border-radius:16px"><p style="color:#c85b40;font-size:12px;font-weight:bold;letter-spacing:2px">PANCHO VILLA</p><h1 style="font-family:Georgia,serif;font-size:30px;font-weight:500">${title}</h1><p>${intro}</p><a href="${href}" style="display:inline-block;margin-top:12px;padding:13px 18px;border-radius:8px;background:#234c3d;color:white;text-decoration:none">${button}</a></div>` };
}

export async function processOutboxBatch(limit = 20) {
  await db.automationJob.updateMany({ where: { status: "PROCESSING", lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } }, data: { status: "PENDING", lockedAt: null } });
  const jobs = await db.automationJob.findMany({ where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 5 }, runAt: { lte: new Date() } }, orderBy: { runAt: "asc" }, take: Math.min(50, Math.max(1, limit)) });
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const candidate of jobs) {
    const claimed = await db.automationJob.updateMany({ where: { id: candidate.id, status: candidate.status, attempts: candidate.attempts }, data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } } });
    if (!claimed.count) { result.skipped++; continue; }
    const payload = candidate.payload as { kind?: string; publicId?: string; status?: string; locale?: string; recipient?: string; notifyEmail?: string; notificationDedupeKey?: string; resetUrl?: string };
    const notificationKey = payload.notificationDedupeKey;
    try {
      if (notificationKey) await db.notification.update({ where: { dedupeKey: notificationKey }, data: { status: "PROCESSING" } });
      if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) throw new Error("EMAIL_PROVIDER_NOT_CONFIGURED");
      const recipient = payload.recipient ?? payload.notifyEmail;
      if (!recipient || (payload.kind === "PASSWORD_RESET" ? !payload.resetUrl : !payload.publicId)) throw new Error("INVALID_EMAIL_JOB");
      const email = emailContent(payload.locale ?? "es", payload.publicId, payload.status, payload.resetUrl);
      const resend = new Resend(process.env.RESEND_API_KEY);
      const sent = await resend.emails.send({ from: process.env.EMAIL_FROM, to: recipient, subject: email.subject, html: email.html }, { idempotencyKey: candidate.dedupeKey });
      if (sent.error) throw new Error(sent.error.message || "EMAIL_PROVIDER_ERROR");
      await db.$transaction([
        db.automationJob.update({ where: { id: candidate.id }, data: { status: "COMPLETED", completedAt: new Date(), lockedAt: null, lastError: null } }),
        ...(notificationKey ? [db.notification.update({ where: { dedupeKey: notificationKey }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null } })] : []),
      ]);
      result.sent++;
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 1500) : "EMAIL_DELIVERY_FAILED";
      const exhausted = candidate.attempts + 1 >= 5;
      const delayMinutes = Math.min(60, 2 ** candidate.attempts);
      await db.$transaction([
        db.automationJob.update({ where: { id: candidate.id }, data: { status: exhausted ? "FAILED" : "PENDING", runAt: new Date(Date.now() + delayMinutes * 60_000), lockedAt: null, lastError: message } }),
        ...(notificationKey ? [db.notification.update({ where: { dedupeKey: notificationKey }, data: { status: "FAILED", attempts: { increment: 1 }, lastError: message } })] : []),
      ]);
      result.failed++;
    }
  }
  return result;
}
