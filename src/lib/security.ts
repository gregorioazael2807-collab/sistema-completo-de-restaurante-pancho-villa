import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  loginSchema,
  registerSchema,
  type RegisterInput,
} from "@/lib/auth-validation";

const DUMMY_HASH = bcrypt.hash("pancho-villa-invalid-account-placeholder", 12);

export async function rateLimit(key: string, maxAttempts = 8, minutes = 15) {
  const duration = minutes * 60_000;
  const bucket = Math.floor(Date.now() / duration);
  const digest = createHash("sha256").update(`${key}:${bucket}`).digest("hex");
  const record = await db.authRateLimit.upsert({
    where: { key: digest },
    create: {
      key: digest,
      count: 1,
      expiresAt: new Date((bucket + 1) * duration),
    },
    update: { count: { increment: 1 } },
  });

  if (record.count > maxAttempts) throw new Error("AUTH_RATE_LIMITED");
}

export async function authenticate(input: unknown, ipAddress = "unknown") {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return null;
  const { email, password } = parsed.data;
  try {
    await rateLimit(`login:${ipAddress}:${email}`);
  } catch {
    return null;
  }

  const user = await db.user.findUnique({ where: { email } });
  const valid = await bcrypt.compare(
    password,
    user?.passwordHash ?? (await DUMMY_HASH),
  );
  if (!user || !user.active || !user.passwordHash || !valid) return null;

  return {
    id: user.id,
    name:
      user.name ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      email,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
  };
}

export async function registerClient(input: unknown) {
  const data: RegisterInput = registerSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  return db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: `${data.firstName} ${data.lastName}`,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        locale: data.locale,
        passwordHash,
        role: "CLIENTE",
        customer: { create: {} },
      },
      select: { id: true, email: true, role: true, locale: true },
    });
    return user;
  });
}
