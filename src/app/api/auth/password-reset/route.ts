import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";

const requestSchema = z.object({ email: z.email().trim().toLowerCase().max(254), locale: z.enum(["es", "en", "de"]).default("es") });
const genericResponse = { message: "If an account matches that email, a reset link will be sent." };

export async function POST(request: Request) {
  const body = requestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  try { await rateLimit(`password-reset:${ip}`, 5, 15); } catch { return Response.json(genericResponse, { status: 202 }); }
  try {
    const user = await db.user.findUnique({ where: { email: body.data.email }, select: { id: true, email: true, locale: true, active: true, passwordHash: true } });
    if (!user?.active || !user.passwordHash) return Response.json(genericResponse, { status: 202 });
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    const url = new URL("/reset-password", process.env.NEXTAUTH_URL ?? "http://localhost:3004");
    url.searchParams.set("token", token);
    const key = `password-reset:${tokenHash}`;
    await db.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
      await tx.passwordResetToken.create({ data: { tokenHash, userId: user.id, expiresAt } });
      await tx.automationJob.create({ data: { dedupeKey: key, kind: "PASSWORD_RESET", runAt: new Date(), payload: { kind: "PASSWORD_RESET", recipient: user.email, locale: body.data.locale ?? user.locale, resetUrl: url.toString(), notificationDedupeKey: key } } });
      await tx.notification.create({ data: { dedupeKey: key, userId: user.id, type: "PASSWORD_RESET", recipient: user.email, locale: body.data.locale ?? user.locale } });
    });
    return Response.json(genericResponse, { status: 202 });
  } catch (error) {
    console.error("[auth:password-reset]", error instanceof Error ? error.message : "unknown error");
    return Response.json(genericResponse, { status: 202 });
  }
}
