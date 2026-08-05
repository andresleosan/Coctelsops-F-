import { expect, test } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL;
const customerEmail = process.env.E2E_CUSTOMER_EMAIL;
const customerPassword = process.env.E2E_CUSTOMER_PASSWORD;
const staffEmail = process.env.E2E_STAFF_EMAIL;
const staffPassword = process.env.E2E_STAFF_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;
const registrationDomain = process.env.E2E_REGISTRATION_DOMAIN;

test.describe("auth, checkout y operaciones administrativas", () => {
  test.skip(!baseURL, "Define E2E_BASE_URL para ejecutar la suite contra una aplicación desplegada localmente.");
  test.use({ baseURL: baseURL ?? "http://127.0.0.1:9002" });
  test.describe.configure({ mode: "serial" });

  let orderId: string | undefined;

  async function login(page: import("@playwright/test").Page, email: string, password: string, path: string) {
    await page.goto(`/login?redirect=${encodeURIComponent(path)}`);
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill(password);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(new RegExp(`${path.replaceAll("/", "\\/")}(?:$|[?#])`));
  }

  async function mockWhatsApp(context: import("@playwright/test").BrowserContext) {
    await context.route("https://wa.me/**", (route) => route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<title>WhatsApp mock</title>",
    }));
  }

  test("registra una cuenta y aplica la barrera de verificación", async ({ page }) => {
    test.skip(!registrationDomain, "Define E2E_REGISTRATION_DOMAIN para crear una cuenta efímera de prueba.");

    const email = `e2e-${Date.now()}@${registrationDomain}`;
    await page.goto("/registro");
    await page.getByLabel("Nombre").fill("Cliente E2E");
    await page.getByLabel("Correo electrónico").fill(email);
    await page.getByLabel("Contraseña").fill("Cliente-E2E-123!");
    await page.getByRole("button", { name: "Crear cuenta" }).click();

    await expect(page).toHaveURL(/\/verificar-email(?:$|[?#])/);
    await expect(page.getByRole("heading", { name: "Verifica tu correo" })).toBeVisible();
    await page.goto("/checkout");
    await expect(page).toHaveURL(/\/verificar-email(?:$|[?#])/);
  });

  test("permite editar perfil, comprar, consultar historial y abrir WhatsApp simulado", async ({ page, context }) => {
    test.skip(!customerEmail || !customerPassword, "Define E2E_CUSTOMER_EMAIL y E2E_CUSTOMER_PASSWORD.");
    await mockWhatsApp(context);
    await login(page, customerEmail!, customerPassword!, "/cuenta");

    await page.goto("/cuenta/perfil");
    await page.getByLabel("Teléfono de contacto").fill("300 000 0000");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByRole("status")).toContainText("Perfil guardado.");

    await page.addInitScript(() => {
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
    await expect(page.getByRole("heading", { name: "Finalizar Pedido" })).toBeVisible();
    await page.getByLabel("Nombre Completo").fill("Cliente E2E");
    await page.getByLabel("Teléfono de Contacto").fill("300 000 0000");
    await page.getByLabel("Dirección Exacta").fill("Carrera 1 # 2-3");
    await page.getByRole("button", { name: "CONFIRMAR PEDIDO" }).click();

    await expect(page).toHaveURL(/\/order-status\/([^/?#]+)/);
    orderId = new URL(page.url()).pathname.split("/").pop();
    expect(orderId).toBeTruthy();

    await page.goto("/cuenta/pedidos");
    await expect(page.getByText(new RegExp(`Pedido #${orderId}`))).toBeVisible();
    await page.getByRole("link", { name: new RegExp(`Pedido #${orderId}`) }).click();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("link", { name: "Confirmar por WhatsApp" }).click();
    const popup = await popupPromise;
    await expect(popup).toHaveTitle("WhatsApp mock");
    await popup.close();
  });

  test("limita la navegación del personal y permite actualizar el estado como administrador", async ({ page, context }) => {
    test.skip(!orderId || !staffEmail || !staffPassword || !adminEmail || !adminPassword, "Requiere un pedido creado y las tres credenciales E2E configuradas.");
    await mockWhatsApp(context);

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
    await page.getByRole("button", { name: /confirmar/i }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);
    expect((await response.json()).order.status).toBe("confirmado");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/admin\/login(?:$|[?#])/);
  });
});
