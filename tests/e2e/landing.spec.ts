import { expect, test } from "@playwright/test";

test("portada carga y el selector cambia el idioma", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: /un poquito de méxico/i }),
  ).toBeVisible();
  await page.getByRole("button", { name: "🇬🇧 EN" }).click();
  await expect(
    page.getByRole("heading", { name: /a little taste of mexico/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Al pastor tacos" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "🇩🇪 DE" }).click();
  await expect(
    page.getByRole("heading", { name: /ein hauch mexiko/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tacos al Pastor" }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tacos al Pastor" }),
  ).toBeVisible();
});

test("portada no desborda el móvil estrecho", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /un poquito de méxico/i }),
  ).toBeVisible();
  const documentWidth = await page
    .locator("body")
    .evaluate((body) => body.scrollWidth);
  const viewportWidth = await page
    .locator("body")
    .evaluate((body) => body.clientWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  await page.screenshot({
    path: "/tmp/pancho-villa-mobile.png",
    fullPage: true,
  });
});

test("portada se compone en dos columnas en desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /un poquito de méxico/i }),
  ).toBeVisible();
  const columns = await page
    .locator(".hero")
    .evaluate((hero) => getComputedStyle(hero).gridTemplateColumns);
  expect(columns.split(" ").length).toBe(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  await page.screenshot({
    path: "/tmp/pancho-villa-desktop.png",
    fullPage: true,
  });
});

test("un visitante se redirige al intentar abrir Mi cuenta", async ({
  page,
}) => {
  await page.goto("/cuenta");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Correo electrónico")).toBeVisible();
});

test("el idioma elegido también se usa al cambiar entre Registro y Login", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/register");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  await page.screenshot({
    path: "/tmp/pancho-register-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "DE", exact: true }).click();
  await expect(page.getByLabel("Vorname")).toBeVisible();
  await page.getByRole("link", { name: "Anmelden" }).click();
  await expect(page.getByLabel("E-Mail-Adresse")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  const documentWidth = await page
    .locator("body")
    .evaluate((body) => body.scrollWidth);
  const viewportWidth = await page
    .locator("body")
    .evaluate((body) => body.clientWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
});

test("Login se presenta en panel dividido en desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Qué bueno verte de nuevo." }),
  ).toBeVisible();
  await expect(page.getByText("BUEN SABOR, CERO COMPLICACIONES")).toBeVisible();
  const columns = await page
    .locator(".auth-layout")
    .evaluate((layout) => getComputedStyle(layout).gridTemplateColumns);
  expect(columns.split(" ").length).toBe(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(50);
  await page.screenshot({
    path: "/tmp/pancho-login-desktop.png",
    fullPage: true,
  });
});
