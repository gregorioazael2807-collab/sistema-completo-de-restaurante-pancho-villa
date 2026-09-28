import { ZodError } from "zod";
import { registerClient, rateLimit } from "@/lib/security";

export async function POST(request: Request) {
  const ipAddress =
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  try {
    await rateLimit(`register:${ipAddress}`, 6, 30);
    const user = await registerClient(await request.json());
    return Response.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: "INVALID_INPUT", fields: error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === "AUTH_RATE_LIMITED") {
      return Response.json({ error: "RATE_LIMITED" }, { status: 429 });
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return Response.json({ error: "EMAIL_EXISTS" }, { status: 409 });
    }
    console.error("Registration failed", error);
    return Response.json(
      { error: "No se pudo crear la cuenta. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
}
