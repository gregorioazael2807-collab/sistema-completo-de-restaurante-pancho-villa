import { describe, expect, it, vi } from "vitest";
vi.mock("../src/lib/db", () => ({ db: { user: { findUnique: vi.fn() } } }));
import { scopedAuthConfig } from "../src/lib/auth-config";

describe("configuración de sesiones independientes", () => {
  it("usa endpoints y cookies separados", () => {
    const customer = scopedAuthConfig("customer");
    const kitchen = scopedAuthConfig("kitchen");
    expect(customer.basePath).toBe("/api/auth");
    expect(kitchen.basePath).toBe("/api/kitchen-auth");
    expect(customer.cookies?.sessionToken?.name).not.toBe(kitchen.cookies?.sessionToken?.name);
  });
  it("CSRF y callback no parecen fragmentos de la cookie de sesión", () => {
    for (const scope of ["customer", "kitchen"] as const) {
      const cookies = scopedAuthConfig(scope).cookies!;
      const sessionName = cookies.sessionToken!.name!;
      expect(cookies.csrfToken!.name!.startsWith(sessionName)).toBe(false);
      expect(cookies.callbackUrl!.name!.startsWith(sessionName)).toBe(false);
      expect(cookies.sessionToken!.options!.httpOnly).toBe(true);
    }
  });
  it("redirige cada acceso a su pantalla", () => {
    expect(scopedAuthConfig("customer").pages?.signIn).toBe("/login");
    expect(scopedAuthConfig("kitchen").pages?.signIn).toBe("/cocina/login");
  });
});
