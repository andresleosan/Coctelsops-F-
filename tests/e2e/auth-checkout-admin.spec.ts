import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

import { getCleanupSafetyError } from "./cleanup-safety";
import { loadLocalE2EState, shouldUseLocalE2EState } from "./local-state";

const localE2EState = shouldUseLocalE2EState() ? loadLocalE2EState() : undefined;
const baseURL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:9002";
const customerEmail = process.env.E2E_CUSTOMER_EMAIL ?? localE2EState?.customer.email;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD ?? localE2EState?.customer.password;
const staffEmail = process.env.E2E_STAFF_EMAIL ?? localE2EState?.staff.email;
const staffPassword = process.env.E2E_STAFF_PASSWORD ?? localE2EState?.staff.password;
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? localE2EState?.admin.email;
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? localE2EState?.admin.password;
const registrationDomain = process.env.E2E_REGISTRATION_DOMAIN ?? (localE2EState ? "local.test" : undefined);
const localNavigationTimeout = 30_000;

type CleanupState = {
  orderIds: string[];
  registrationEmails: string[];
};

function newCleanupState(): CleanupState {
  return { orderIds: [], registrationEmails: [] };
}

async function cleanupE2EState(state: CleanupState): Promise<void> {
  if (process.env.E2E_CLEANUP !== "true" || (state.orderIds.length === 0 && state.registrationEmails.length === 0)) return;

  const safetyError = getCleanupSafetyError(process.env);
  if (safetyError) throw new Error(safetyError);
  const projectId = process.env.FIREBASE_PROJECT_ID!.trim();

  const app = getApps().find((candidate) => candidate.name === "e2e-cleanup") ?? initializeApp({
    projectId,
  }, "e2e-cleanup");
  // Firebase Admin routes these clients to the local emulators via the required host variables.
  const db = getFirestore(app);
  const auth = getAuth(app);

  await Promise.all(state.orderIds.map((orderId) => db.collection("pedidos").doc(orderId).delete()));
  for (const orderId of state.orderIds) {
    const [notifications, audits] = await Promise.all([
      db.collection("notificaciones").where("orderId", "==", orderId).get(),
      db.collection("auditoria").where("module", "==", "pedidos").where("entityId", "==", orderId).get(),
    ]);
    const batch = db.batch();
    notifications.docs.forEach((document) => batch.delete(document.ref));
    audits.docs.forEach((document) => batch.delete(document.ref));
    if (notifications.size > 0 || audits.size > 0) await batch.commit();
  }
  for (const email of state.registrationEmails) {
    try {
      const user = await auth.getUserByEmail(email);
      await db.collection("users").doc(user.uid).delete();
      await auth.deleteUser(user.uid);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found") throw error;
    }
  }
}

test.describe("auth, checkout y operaciones administrativas", () => {
  test.use({ baseURL });

  test.beforeEach(async ({ page }) => {
    if (shouldUseLocalE2EState()) {
      const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
      await page.route(`http://${authEmulatorHost}/**`, async (route) => {
        const url = new URL(route.request().url());
        console.log(`[E2E Route] ${route.request().method()} ${url.pathname}`);
        if (url.pathname.includes("/identitytoolkit.googleapis.com/v1/")) {
          url.searchParams.set("key", "demo-key");
          await route.continue({ url: url.toString() });
          return;
        }
        await route.continue();
      });
    }
    page.on("console", (message) => {
      if (message.type() === "error") console.log(`[E2E Console] ${message.type()}`);
    });
    page.on("pageerror", (error) => console.log(`[E2E PageError] ${error.name}`));
    page.on("response", (response) => {
      if (response.status() >= 400) {
        console.log(`[E2E HTTP] ${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
  });

  async function login(page: Page, email: string, password: string, path: string) {
    await page.goto(`/login?redirect=${encodeURIComponent(path)}`);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}(?:$|[?#])`), { timeout: 30_000 });
  }

  async function logoutFromStore(page: Page) {
    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page.getByRole("link", { name: "Ingresar" })).toBeVisible();
  }

  async function mockWhatsApp(context: BrowserContext) {
    await context.route("https://wa.me/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>WhatsApp mock</title>",
    }));
  }

  async function createOrder(page: Page, email: string, password: string): Promise<string> {
    await login(page, email, password, "/cuenta");
    await page.evaluate(() => {
      localStorage.setItem("granizado_go_cart", JSON.stringify([{
        id: "e2e-item",
        productId: "1",
        name: "Fresa Salvaje",
        price: 8500,
        quantity: 1,
        image: "",
        customization: { size: "Medium", flavors: ["Fresa"], addOns: [] },
      }]));
    });
    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Finalizar Pedido" })).toBeVisible({ timeout: localNavigationTimeout });
    await page.getByLabel("Nombre Completo").fill("Cliente E2E");
    await page.getByLabel("Teléfono de Contacto").fill("300 000 0000");
    await page.getByLabel("Dirección Exacta").fill("Carrera 1 # 2-3");
    await page.getByRole("button", { name: "CONFIRMAR PEDIDO" }).click();
    await expect(page).toHaveURL(/\/order-status\/([^/?#]+)/, { timeout: 30_000 });

    const orderId = new URL(page.url()).pathname.split("/").pop();
    if (!orderId) throw new Error("El checkout E2E no devolvió un ID de pedido.");
    return orderId;
  }

  test("registra una cuenta y aplica la barrera de verificación", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!registrationDomain, "Define E2E_REGISTRATION_DOMAIN para crear una cuenta efímera de prueba.");
    const cleanup = newCleanupState();
    const email = `e2e-${Date.now()}@${registrationDomain}`;
    cleanup.registrationEmails.push(email);

    try {
      await page.goto("/registro");
      await page.getByLabel("Nombre").fill("Cliente E2E");
      await page.getByLabel("Correo electrónico").fill(email);
      await page.getByLabel("Contraseña").fill("Cliente-E2E-123!");
      await page.getByRole("button", { name: "Crear cuenta" }).click();

      await expect(page).toHaveURL(/\/verificar-email(?:$|[?#])/, { timeout: localNavigationTimeout });
      await expect(page.getByRole("heading", { name: "Verifica tu correo" })).toBeVisible({ timeout: localNavigationTimeout });
      await page.goto("/checkout");
      await expect(page).toHaveURL(/\/verificar-email(?:$|[?#])/, { timeout: localNavigationTimeout });
    } finally {
      await cleanupE2EState(cleanup);
    }
  });

  test("permite editar perfil, comprar, consultar historial y abrir WhatsApp simulado", async ({ page, context }) => {
    test.setTimeout(120_000);
    test.skip(!customerEmail || !customerPassword, "Define E2E_CUSTOMER_EMAIL y E2E_CUSTOMER_PASSWORD.");
    const cleanup = newCleanupState();
    await mockWhatsApp(context);

    try {
      await login(page, customerEmail!, customerPassword!, "/cuenta");
      await page.goto("/cuenta/perfil");
      await page.getByLabel("Teléfono de contacto").fill("300 000 0000");
      await page.getByRole("button", { name: "Guardar cambios" }).click();
      await expect(page.getByRole("status")).toContainText("Perfil guardado.");

      const orderId = await createOrder(page, customerEmail!, customerPassword!);
      cleanup.orderIds.push(orderId);
      await page.goto("/cuenta/pedidos");
      await expect(page.getByText(new RegExp(`Pedido #${orderId}`))).toBeVisible({ timeout: localNavigationTimeout });
      await expect(page.getByRole("link", { name: "Ver detalle" })).toHaveCount(1, { timeout: localNavigationTimeout });
      await page.getByRole("link", { name: "Ver detalle" }).click();
      await expect(page).toHaveURL(new RegExp(`/cuenta/pedidos/${orderId}(?:$|[?#])`), { timeout: localNavigationTimeout });
      const popupPromise = context.waitForEvent("page");
      await page.getByRole("link", { name: "Confirmar por WhatsApp" }).click();
      const popup = await popupPromise;
      await expect(popup).toHaveTitle("WhatsApp mock");
      await popup.close();
    } finally {
      await cleanupE2EState(cleanup);
    }
  });

  test("limita la navegación del personal y permite actualizar el estado como administrador", async ({ page }) => {
    test.setTimeout(120_000);
    test.skip(!customerEmail || !customerPassword || !staffEmail || !staffPassword || !adminEmail || !adminPassword, "Requiere credenciales E2E de cliente, personal y administrador.");
    const cleanup = newCleanupState();

    try {
      const orderId = await createOrder(page, customerEmail!, customerPassword!);
      cleanup.orderIds.push(orderId);
      await logoutFromStore(page);

      await login(page, staffEmail!, staffPassword!, "/admin/dashboard");
      const navigation = page.getByRole("navigation", { name: "Navegación de administración" });
      await expect(navigation.getByRole("link", { name: "Pedidos" })).toBeVisible();
      await expect(navigation.getByRole("link", { name: "Productos" })).toHaveCount(0);
      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page).toHaveURL(/\/admin\/login(?:$|[?#])/);

      await login(page, adminEmail!, adminPassword!, "/admin/dashboard");
      await page.goto(`/admin/pedidos/${orderId}`);
      await expect(page.getByRole("heading", { name: `#${orderId}` })).toBeVisible();
      page.on("dialog", (dialog) => void dialog.accept());
      const responsePromise = page.waitForResponse((response) => response.url().endsWith(`/api/pedidos/${orderId}`) && response.request().method() === "PATCH");
      const actionButton = page.getByRole("button", { name: /confirmar|preparar/i });
      const expectedStatus = /confirmar/i.test(await actionButton.innerText()) ? "confirmado" : "preparando";
      await actionButton.click();
      const response = await responsePromise;
      expect(response.ok()).toBe(true);
      expect((await response.json()).order.status).toBe(expectedStatus);

      await page.getByRole("button", { name: "Cerrar sesión" }).click();
      await expect(page).toHaveURL(/\/admin\/login(?:$|[?#])/);
    } finally {
      await cleanupE2EState(cleanup);
    }
  });
});
