import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function getActor() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      sessionVersion: true,
    },
  });
  if (
    !user ||
    !user.active ||
    user.sessionVersion !== session.user.sessionVersion
  )
    return null;
  return user;
}

export async function requireRole(roles: Role[]) {
  const actor = await getActor();
  if (!actor)
    return {
      response: Response.json({ error: "UNAUTHENTICATED" }, { status: 401 }),
    } as const;
  if (!roles.includes(actor.role)) {
    return {
      response: Response.json({ error: "FORBIDDEN" }, { status: 403 }),
    } as const;
  }
  return { actor } as const;
}
