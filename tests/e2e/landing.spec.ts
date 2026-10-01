import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/catalog?locale=*", async (route) => {
    const locale = new URL(route.request().url()).searchParams.get("locale");
    const name =
      locale === "en"
        ? "Al pastor tacos"
        : locale === "de"
          ? "Tacos al Pastor"
          : "Tacos al pastor";
    await route.fulfill({
      json: {
        locale,
        categories: [
          {
            slug: "tacos",
            name: "Tacos",
            products: [
              {
                id: "taco-preview",
                slug: "tacos-al-pastor",
                name,
                description: "Tacos al pastor with pineapple.",
                ingredients: ["cerdo", "piña"],
                allergens: [],
                price: 12.5,
                currency: "EUR",
                featured: true,
                image: {
                  src: "/menu/tacos-photo.jpg",
                  alt: "Tacos with pineapple",
                },
                modifierGroups: [{ id: "salsas", name: "Salsas", required: false, minSelect: 0, maxSelect: 1, modifiers: [{ id: "salsa-verde", name: "Salsa verde", priceDelta: 0 }] }],
              },
            ],
          },
        ],
      },
    });
  });
});

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

test("el menú carga productos traducidos, filtra por categoría y no desborda en móvil", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/catalog?locale=*", async (route) => {
    const locale = new URL(route.request().url()).searchParams.get("locale");
    const values = {
      es: {
        categories: [
          {
            slug: "tacos",
            name: "Tacos",
            products: [
              {
                id: "taco-1",
                slug: "tacos-al-pastor",
                name: "Tacos al pastor",
                description: "Cerdo marinado con piña, cilantro y cebolla.",
                ingredients: ["cerdo", "piña", "cilantro"],
                allergens: [],
                price: 12.5,
                currency: "EUR",
                featured: true,
                image: { src: "/menu/tacos-photo.jpg", alt: "Tacos con piña" },
              },
            ],
          },
          {
            slug: "bebidas",
            name: "Bebidas",
            products: [
              {
                id: "horchata-1",
                slug: "horchata",
                name: "Horchata",
                description: "Bebida fría de arroz y canela.",
                ingredients: ["arroz", "canela"],
                allergens: ["milk"],
                price: 4.2,
                currency: "EUR",
                featured: false,
                image: {
                  src: "/menu/drinks-photo.jpg",
                  alt: "Vaso de horchata",
                },
              },
            ],
          },
        ],
      },
      en: {
        categories: [
          {
            slug: "tacos",
            name: "Tacos",
            products: [
              {
                id: "taco-1",
                slug: "tacos-al-pastor",
                name: "Al pastor tacos",
                description:
                  "Marinated pork with pineapple, coriander and onion.",
                ingredients: ["cerdo", "piña", "cilantro"],
                allergens: [],
                price: 12.5,
                currency: "EUR",
                featured: true,
                image: {
                  src: "/menu/tacos-photo.jpg",
                  alt: "Tacos with pineapple",
                },
              },
            ],
          },
          {
            slug: "bebidas",
            name: "Drinks",
            products: [
              {
                id: "horchata-1",
                slug: "horchata",
                name: "Horchata",
                description: "Cold rice and cinnamon drink.",
                ingredients: ["arroz", "canela"],
                allergens: ["milk"],
                price: 4.2,
                currency: "EUR",
                featured: false,
                image: {
                  src: "/menu/drinks-photo.jpg",
                  alt: "Glass of horchata",
                },
              },
            ],
          },
        ],
      },
      de: {
        categories: [
          {
            slug: "tacos",
            name: "Tacos",
            products: [
              {
                id: "taco-1",
                slug: "tacos-al-pastor",
                name: "Tacos al Pastor",
                description:
                  "Mariniertes Schweinefleisch mit Ananas, Koriander und Zwiebel.",
                ingredients: ["cerdo", "piña", "cilantro"],
                allergens: [],
                price: 12.5,
                currency: "EUR",
                featured: true,
                image: {
                  src: "/menu/tacos-photo.jpg",
                  alt: "Tacos mit Ananas",
                },
              },
            ],
          },
          {
            slug: "bebidas",
            name: "Getränke",
            products: [
              {
                id: "horchata-1",
                slug: "horchata",
                name: "Horchata",
                description: "Kaltes Reisgetränk mit Zimt.",
                ingredients: ["arroz", "canela"],
                allergens: ["milk"],
                price: 4.2,
                currency: "EUR",
                featured: false,
                image: { src: "/menu/drinks-photo.jpg", alt: "Glas Horchata" },
              },
            ],
          },
        ],
      },
    } as const;
    await route.fulfill({
      json: values[locale === "en" || locale === "de" ? locale : "es"],
    });
  });
  await page.goto("/menu");
  await expect(
    page.getByRole("heading", { name: "Tacos al pastor" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Bebidas" }).click();
  await expect(page.getByRole("heading", { name: "Horchata" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tacos al pastor" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "🇬🇧 EN" }).click();
  await expect(page.getByRole("heading", { name: "The menu" })).toBeVisible();
  await page.getByRole("button", { name: "Drinks" }).click();
  await expect(page.getByPlaceholder("Search dishes")).toBeVisible();
  const documentWidth = await page
    .locator("body")
    .evaluate((body) => body.scrollWidth);
  const viewportWidth = await page
    .locator("body")
    .evaluate((body) => body.clientWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);
});

test("el carrito calcula cesta, valida checkout y muestra pedido idempotente", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/checkout-info", (route) => route.fulfill({ json: { taxRate: 0.19, deliveryFee: 2.5, currency: "EUR", pickupEnabled: true, deliveryEnabled: true, acceptingOrders: true } }));
  await page.goto("/menu");
  await page.getByRole("checkbox", { name: "Salsa verde" }).check();
  await page.getByRole("button", { name: "Añadir al carrito" }).first().click();
  await page.getByRole("link", { name: /Carrito \(1\)/ }).click();
  await expect(page.getByRole("heading", { name: "Tu pedido" })).toBeVisible();
  await expect(page.getByText("12,50 €").first()).toBeVisible();
  await page.getByLabel("Nombre completo").fill("Ada Lovelace");
  await page.getByLabel("Correo electrónico").fill("ada@example.com");
  await page.getByLabel("Teléfono").fill("+49123456789");
  await page.route("**/api/orders", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.items[0]).toMatchObject({ productId: "taco-preview", quantity: 1, modifierIds: ["salsa-verde"] });
    expect(body.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
    await route.fulfill({ status: 201, json: { id: "order-id", publicId: "MX-0123456789ABCDEF0123", status: "NUEVO", total: "14.88", currency: "EUR" } });
  });
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: "¡Pedido recibido!" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver estado del pedido" })).toHaveAttribute("href", "/pedido/MX-0123456789ABCDEF0123");
  const scroll = await page.locator("body").evaluate((body) => body.scrollWidth <= body.clientWidth);
  expect(scroll).toBeTruthy();
});

test("admin, cocina y asistente protegen páginas y APIs de visitantes", async ({ page, request }) => {
  for (const path of ["/admin", "/cocina", "/asistente"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  for (const path of ["/api/admin/summary", "/api/admin/products", "/api/kitchen/orders", "/api/ai/orders"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
  }
  const ai = await request.post("/api/ai/chat", { data: { message: "What is popular?" } });
  expect(ai.status()).toBe(401);
});

test("flujo real PostgreSQL: cliente crea pedido y cocina lo prepara", async ({ page }) => {
  test.skip(!process.env.DATABASE_URL || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD, "Requires the isolated test PostgreSQL and bootstrap admin credentials.");
  await page.unrouteAll();
  const customerEmail = `pv-playwright-${Date.now()}@example.test`;
  const password = "PanchoFlowTest2026!";
  await page.goto("/register");
  await page.getByLabel("Nombre").fill("Elena");
  await page.getByLabel("Apellido").fill("Prueba");
  await page.getByLabel("Correo electrónico").fill(customerEmail);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Crear cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await expect(page.getByRole("heading", { name: /¡Hola, Elena/ })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/pancho-villa-account-real-mobile.png", fullPage: true });

  await page.goto("/menu");
  await expect(page.getByRole("heading", { name: "Tacos al pastor" })).toBeVisible();
  await page.screenshot({ path: "/tmp/pancho-villa-menu-real-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Añadir al carrito" }).first().click();
  await page.getByRole("link", { name: /Carrito \(1\)/ }).click();
  await page.getByLabel("Nombre completo").fill("Elena Prueba");
  await page.getByLabel("Correo electrónico").fill(customerEmail);
  await page.getByLabel("Teléfono").fill("+49123456789");
  await page.screenshot({ path: "/tmp/pancho-villa-checkout-real-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Confirmar pedido" }).click();
  await expect(page.getByRole("heading", { name: "¡Pedido recibido!" })).toBeVisible();
  const confirmationText = await page.locator(".checkout-success").innerText();
  const publicId = confirmationText.match(/MX-[A-F0-9]{20}/)?.[0];
  expect(publicId).toBeTruthy();

  await page.getByRole("link", { name: "Mis pedidos" }).click();
  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/:3004\/$/);
  await page.goto("/login");
  await page.getByLabel("Correo electrónico").fill(process.env.ADMIN_EMAIL!);
  await page.getByLabel("Contraseña").fill(process.env.ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/cuenta$/);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Resumen del negocio" })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.screenshot({ path: "/tmp/pancho-villa-admin-real-desktop.png", fullPage: true });
  await page.goto("/admin/productos");
  const managedProduct = page.locator(".catalog-admin-row").filter({ hasText: "tacos-al-pastor" });
  await managedProduct.getByRole("button", { name: "Editar", exact: true }).click();
  await page.locator(".catalog-admin-form").getByLabel("Precio (€)", { exact: true }).fill("13.25");
  await page.locator(".catalog-admin-form").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await page.screenshot({ path: "/tmp/pancho-villa-products-real-desktop.png", fullPage: true });
  await managedProduct.getByRole("button", { name: "Editar", exact: true }).click();
  await page.locator(".catalog-admin-form").getByLabel("Precio (€)", { exact: true }).fill("12.50");
  await page.locator(".catalog-admin-form").getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Guardado" })).toBeVisible();
  await page.goto("/admin/automatizaciones");
  await expect(page.getByRole("heading", { name: "Automatizaciones" })).toBeVisible();
  await page.screenshot({ path: "/tmp/pancho-villa-automation-real-desktop.png", fullPage: true });
  await page.goto("/asistente");
  await expect(page.getByRole("heading", { name: "Asistente Pancho Villa" })).toBeVisible();
  const assistantInput = page.getByRole("textbox", { name: "¿Qué te gustaría comer?" });
  await assistantInput.fill("Recomiéndame tacos al pastor");
  await assistantInput.press("Enter");
  await expect(page.getByText("Recomiéndame tacos al pastor")).toBeVisible();
  await expect(page.getByText(/El asistente IA aún no está configurado/)).toBeVisible();
  await page.screenshot({ path: "/tmp/pancho-villa-assistant-real-desktop.png", fullPage: true });
  await page.goto("/cocina");
  await expect(page.getByText(publicId!, { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: "/tmp/pancho-villa-kitchen-real-tablet.png", fullPage: true });
  const ticket = page.locator(".kitchen-order").filter({ hasText: publicId! });
  await ticket.getByRole("button", { name: "Aceptar" }).click();
  await ticket.getByRole("button", { name: "Empezar" }).click();
  await ticket.getByRole("button", { name: "Listo" }).click();
  await page.goto(`/pedido/${publicId}`);
  await expect(page.locator(".tracking-stages")).toContainText("Listo");
});
