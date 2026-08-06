import { expect, test, type Page } from "@playwright/test";

import { loadLocalE2EState, shouldUseLocalE2EState } from "./local-state";

const localE2EState = shouldUseLocalE2EState() ? loadLocalE2EState() : undefined;
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:9002";
const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? localE2EState?.customer.email;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? localE2EState?.customer.password;
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? localE2EState?.admin.email;
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? localE2EState?.admin.password;

async function assertNoHorizontalOverflow(page: Page, route: string): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(dimensions.scrollWidth, `${route} desborda horizontalmente`).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
}

test.describe("responsive de recorridos principales", () => {
  test.use({ baseURL });

  test.beforeEach(async ({ page }) => {
    if (shouldUseLocalE2EState()) {
      const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
      await page.route(`http://${authEmulatorHost}/**`, async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.includes("/identitytoolkit.googleapis.com/v1/")) {
          url.searchParams.set("key", "demo-key");
          await route.continue({ url: url.toString() });
          return;
        }
        await route.continue();
      });
    }
  });

  test("mantiene cuenta y checkout utilizables en móvil y desktop", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!customerEmail || !customerPassword, "Requiere credenciales E2E de cliente.");

    for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/login?redirect=%2Fcuenta");
      await page.getByLabel("Correo electrónico").fill(customerEmail!);
      await page.getByLabel("Contraseña").fill(customerPassword!);
      const authSyncResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/auth/sync" && response.request().method() === "POST";
      });
      await page.getByRole("button", { name: "Ingresar" }).click();
      expect((await authSyncResponse).status()).toBe(200);

      await expect(page).toHaveURL(/\/cuenta(?:$|[?#])/);
      await expect(page.getByRole("heading", { name: "Mi cuenta" })).toBeVisible();
      await assertNoHorizontalOverflow(page, "/cuenta");

      await page.evaluate(() => {
        localStorage.setItem("granizado_go_cart", JSON.stringify([{
          id: "responsive-item",
          productId: "1",
          name: "Fresa Salvaje",
          price: 8500,
          quantity: 1,
          image: "",
          customization: { size: "Medium", flavors: ["Fresa"], addOns: [] },
        }]));
      });
      await page.goto("/checkout");
      await expect(page.getByRole("heading", { name: "Finalizar Pedido" })).toBeVisible();
      await assertNoHorizontalOverflow(page, "/checkout");

      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();
    }
  });

  test("mantiene el panel administrativo navegable en móvil y desktop", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!adminEmail || !adminPassword, "Requiere credenciales E2E de administrador.");

    for (const viewport of [{ width: 375, height: 812 }, { width: 1280, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.goto("/admin/login");
      await page.getByLabel("Correo electrónico").fill(adminEmail!);
      await page.getByLabel("Contraseña").fill(adminPassword!);
      const authSyncResponse = page.waitForResponse((response) => {
        const url = new URL(response.url());
        return url.pathname === "/api/auth/sync" && response.request().method() === "POST";
      });
      await page.getByRole("button", { name: "Ingresar" }).click();
      expect((await authSyncResponse).status()).toBe(200);

      await expect(page).toHaveURL(/\/admin\/dashboard(?:$|[?#])/);
      await expect(page.getByRole("heading", { name: "Resumen operativo" })).toBeVisible();
      await assertNoHorizontalOverflow(page, "/admin/dashboard");

      if (viewport.width < 768) {
        await page.getByRole("button", { name: "Abrir menú" }).click();
        await expect(page.getByRole("navigation", { name: "Navegación de administración" })).toBeVisible();
        await page.getByRole("button", { name: "Cerrar sesión" }).click();
      } else {
        await expect(page.getByRole("navigation", { name: "Navegación de administración" })).toBeVisible();
        await page.getByRole("button", { name: "Cerrar sesión" }).click();
      }

      await expect(page).toHaveURL(/\/admin\/login(?:$|[?#])/);
    }
  });
});
