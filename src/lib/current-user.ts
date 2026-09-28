import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function requireCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
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
    user.sessionVersion !== session.user.sessionVersion
  ) {
    redirect("/login?expired=1");
  }

  return user;
}
