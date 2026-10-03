import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/security";
import { kitchenOwnerRegistrationSchema } from "@/lib/kitchen-owner-validation";

export async function POST(request: Request) {
  // Solo formularios del mismo origen; no se concede una sesión ADMIN heredada.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "INVALID_ORIGIN" }, { status: 403 });
  }
  const input = kitchenOwnerRegistrationSchema.safeParse(await request.json().catch(() => null));
  if (!input.success) return Response.json({ error: "INVALID_INPUT" }, { status: 400 });

  try {
    await rateLimit("kitchen-owner-register", 20, 15);
  } catch {
    return Response.json({ error: "TRY_LATER" }, { status: 429 });
  }

  try {
    const passwordHash = await bcrypt.hash(input.data.password, 12);
    // La creación anidada es atómica: nunca deja un restaurante sin propietario.
    await db.kitchenOwner.create({
      data: {
        email: input.data.email,
        name: input.data.ownerName,
        passwordHash,
        restaurants: { create: { name: input.data.restaurantName } },
      },
      select: { id: true },
    });
    return Response.json({ created: true, kitchenAccessReady: false }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "OWNER_EMAIL_EXISTS" }, { status: 409 });
    }
    return Response.json({ error: "REGISTRATION_UNAVAILABLE" }, { status: 503 });
  }
}
