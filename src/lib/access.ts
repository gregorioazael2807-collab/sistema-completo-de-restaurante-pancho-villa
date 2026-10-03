import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { kitchenAuth } from "@/kitchen-auth";
import type { AuthScope } from "@/lib/auth-config";
import { db } from "@/lib/db";

export async function getActor(scope: AuthScope = "customer") {
  const session = await (scope === "kitchen" ? kitchenAuth() : auth());
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      role: true,
      active: true,
      sessionVersion: true,
      kitchenOwner: { select: { active: true, restaurants: { select: { active: true } } } },
    },
  });
  if (
    !user ||
    !user.active ||
    user.sessionVersion !== session.user.sessionVersion ||
    (scope === "customer" && user.role !== "CLIENTE") ||
    (scope === "kitchen" && (user.role !== "ADMIN" || !user.kitchenOwner?.active ||
      user.kitchenOwner.restaurants.length !== 1 || !user.kitchenOwner.restaurants[0].active))
  )
    return null;
  return user;
}

export async function requireRole(roles: Role[]) {
  // El permiso solicitado elige la sesión; nunca se mezclan cookies disponibles.
  const scope: AuthScope = roles.includes("CLIENTE") ? "customer" : "kitchen";
  const actor = await getActor(scope);
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
