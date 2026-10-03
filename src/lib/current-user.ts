import { redirect } from "next/navigation";
import { getActor } from "@/lib/access";
import type { AuthScope } from "@/lib/auth-config";
import { db } from "@/lib/db";

export async function requireCurrentUser(scope: AuthScope = "customer") {
  const actor = await getActor(scope);
  const login = scope === "kitchen" ? "/cocina/login" : "/login";
  if (!actor) redirect(login);

  const user = await db.user.findUnique({
    where: { id: actor.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      locale: true,
      timezone: true,
      role: true,
      active: true,
      sessionVersion: true,
    },
  });

  if (
    !user ||
    !user.active ||
    user.sessionVersion !== actor.sessionVersion
  ) {
    redirect(`${login}?expired=1`);
  }

  return user;
}
