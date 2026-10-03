import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";

const login = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(128),
});
const dummyHash = bcrypt.hash("Kitchen-owner-invalid-placeholder-123", 12);

export async function authenticateKitchenOwner(input: unknown) {
  const parsed = login.safeParse(input);
  if (!parsed.success) return null;
  try { await rateLimit(`kitchen-owner-login:${parsed.data.email}`); }
  catch { return null; }

  const owner = await db.kitchenOwner.findUnique({
    where: { email: parsed.data.email },
    include: { kitchenUser: true, restaurants: { select: { active: true } } },
  });
  const valid = await bcrypt.compare(parsed.data.password, owner?.passwordHash ?? await dummyHash);
  const user = owner?.kitchenUser;
  // Solo una activación privada puede crear este vínculo. Registro no concede ADMIN.
  if (!valid || !owner?.active || !user?.active || user.role !== "ADMIN" ||
      owner.restaurants.length !== 1 || !owner.restaurants[0].active) return null;
  return {
    id: user.id,
    name: owner.name,
    email: user.email,
    role: user.role,
    sessionVersion: user.sessionVersion,
  };
}
