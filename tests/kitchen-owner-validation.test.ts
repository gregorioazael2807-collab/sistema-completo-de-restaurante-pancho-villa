import { describe, expect, it } from "vitest";
import { kitchenOwnerRegistrationSchema } from "../src/lib/kitchen-owner-validation";

const valid = {
  ownerName: "Propietario de prueba",
  restaurantName: "Restaurante de prueba",
  email: " OWNER@example.com ",
  password: "ClaveDePrueba123",
};

describe("registro de propietario de cocina", () => {
  it("normaliza el correo y acepta datos válidos", () => {
    expect(kitchenOwnerRegistrationSchema.parse(valid).email).toBe("owner@example.com");
  });
  it("rechaza contraseñas débiles", () => {
    for (const password of ["Corta1", "sinmayusculas123", "SinNumerosLargos"]) {
      expect(kitchenOwnerRegistrationSchema.safeParse({ ...valid, password }).success).toBe(false);
    }
  });
  it("no permite elegir rol ni apropiarse de un restaurante existente", () => {
    for (const extra of [{ role: "ADMIN" }, { restaurantId: "ajeno" }, { ownerId: "ajeno" }]) {
      expect(kitchenOwnerRegistrationSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
  });
  it("rechaza nombres vacíos y correos incorrectos", () => {
    for (const extra of [{ ownerName: " " }, { restaurantName: " " }, { email: "incorrecto" }]) {
      expect(kitchenOwnerRegistrationSchema.safeParse({ ...valid, ...extra }).success).toBe(false);
    }
  });
});
