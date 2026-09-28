import { describe, expect, it } from "vitest";
import { registerSchema } from "@/lib/auth-validation";

const validClient = {
  firstName: "Ana",
  lastName: "López",
  email: "ANA@example.com",
  password: "ComidaSegura2026",
  locale: "es",
};

describe("registro de cuentas cliente", () => {
  it("normaliza el correo y no acepta un rol enviado por el visitante", () => {
    const parsed = registerSchema.parse({ ...validClient, role: "ADMIN" });
    expect(parsed.email).toBe("ana@example.com");
    expect(parsed).not.toHaveProperty("role");
  });

  it.each(["corta1A", "largaperosinnumeroA", "LARGASINMINUSCULAS2026"])(
    "rechaza contraseñas débiles",
    (password) => {
      expect(
        registerSchema.safeParse({ ...validClient, password }).success,
      ).toBe(false);
    },
  );
});
