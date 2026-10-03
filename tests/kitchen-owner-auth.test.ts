import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findUnique: vi.fn(), rateLimit: vi.fn(), compare: vi.fn() }));
vi.mock("../src/lib/db", () => ({ db: { kitchenOwner: { findUnique: mocks.findUnique } } }));
vi.mock("../src/lib/security", () => ({ rateLimit: mocks.rateLimit }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn().mockResolvedValue("dummy"), compare: mocks.compare } }));
import { authenticateKitchenOwner } from "../src/lib/kitchen-owner-auth";

const input = { email: "owner@example.com", password: "ClaveDePrueba123" };
const owner = {
  id: "owner", name: "Propietario", active: true, passwordHash: "hash",
  restaurants: [{ active: true }],
  kitchenUser: { id: "internal-admin", email: "internal@internal.invalid", active: true, role: "ADMIN", sessionVersion: 2 },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.rateLimit.mockResolvedValue(undefined);
  mocks.compare.mockResolvedValue(true);
  mocks.findUnique.mockResolvedValue(owner);
});
describe("acceso privado de propietarios", () => {
  it("usa exclusivamente el ADMIN vinculado por activación", async () => {
    expect(await authenticateKitchenOwner(input)).toMatchObject({ id: "internal-admin", role: "ADMIN", sessionVersion: 2 });
  });
  it("rechaza cuentas sin activación", async () => {
    mocks.findUnique.mockResolvedValue({ ...owner, kitchenUser: null });
    expect(await authenticateKitchenOwner(input)).toBeNull();
  });
  it("rechaza una contraseña incorrecta", async () => {
    mocks.compare.mockResolvedValue(false);
    expect(await authenticateKitchenOwner(input)).toBeNull();
  });
  it("rechaza cuentas o restaurantes desactivados", async () => {
    for (const value of [{ ...owner, active: false }, { ...owner, restaurants: [{ active: false }] }, { ...owner, kitchenUser: { ...owner.kitchenUser, active: false } }]) {
      mocks.findUnique.mockResolvedValue(value);
      expect(await authenticateKitchenOwner(input)).toBeNull();
    }
  });
  it("no convierte una cuenta CLIENTE en ADMIN", async () => {
    mocks.findUnique.mockResolvedValue({ ...owner, kitchenUser: { ...owner.kitchenUser, role: "CLIENTE" } });
    expect(await authenticateKitchenOwner(input)).toBeNull();
  });
  it("rechaza varios restaurantes en la misma instalación", async () => {
    mocks.findUnique.mockResolvedValue({ ...owner, restaurants: [{ active: true }, { active: true }] });
    expect(await authenticateKitchenOwner(input)).toBeNull();
  });
});
