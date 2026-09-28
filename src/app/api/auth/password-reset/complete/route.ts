import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { registerSchema } from "@/lib/auth-validation";

const completeSchema = z.object({ token: z.string().min(30).max(128), password: registerSchema.shape.password });

export async function POST(request: Request) {
  const body = completeSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "INVALID_RESET" }, { status: 400 });
  const tokenHash = createHash("sha256").update(body.data.token).digest("hex");
  try {
    const passwordHash = await bcrypt.hash(body.data.password, 12);
    const changed = await db.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findFirst({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, userId: true } });
      if (!token) return false;
      const redeemed = await tx.passwordResetToken.updateMany({ where: { id: token.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
      if (redeemed.count !== 1) return false;
      await tx.user.update({ where: { id: token.userId }, data: { passwordHash, sessionVersion: { increment: 1 } } });
      await tx.passwordResetToken.deleteMany({ where: { userId: token.userId, id: { not: token.id }, usedAt: null } });
      return true;
    });
    return changed ? Response.json({ changed: true }) : Response.json({ error: "RESET_INVALID_OR_EXPIRED" }, { status: 400 });
  } catch (error) {
    console.error("[auth:password-reset-complete]", error instanceof Error ? error.message : "unknown error");
    return Response.json({ error: "RESET_UNAVAILABLE" }, { status: 503 });
  }
}
