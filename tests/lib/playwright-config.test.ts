import { afterEach, describe, expect, it, vi } from "vitest";

const originalBaseURL = process.env.E2E_BASE_URL;
const originalFirestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const originalAuthHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const originalPublicFirestoreHost = process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
const originalPublicAuthHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;

afterEach(() => {
  if (originalBaseURL === undefined) delete process.env.E2E_BASE_URL;
  else process.env.E2E_BASE_URL = originalBaseURL;
  if (originalFirestoreHost === undefined) delete process.env.FIRESTORE_EMULATOR_HOST;
  else process.env.FIRESTORE_EMULATOR_HOST = originalFirestoreHost;
  if (originalAuthHost === undefined) delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  else process.env.FIREBASE_AUTH_EMULATOR_HOST = originalAuthHost;
  if (originalPublicFirestoreHost === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
  else process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST = originalPublicFirestoreHost;
  if (originalPublicAuthHost === undefined) delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  else process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = originalPublicAuthHost;
  vi.resetModules();
});

async function loadConfig() {
  vi.resetModules();
  return (await import("../../playwright.config")).default;
}

describe("configuracion local de Playwright", () => {
  it("usa reportes, resultados y servidor local con emuladores", async () => {
    delete process.env.E2E_BASE_URL;

    const config = await loadConfig();
    const webServer = config.webServer;

    expect(config.testDir).toBe("./tests/e2e");
    expect(config.use?.baseURL).toBe("http://127.0.0.1:9002");
    expect(config.workers).toBe(1);
    expect(config.use?.trace).toBe("retain-on-failure");
    expect(config.use?.screenshot).toBe("only-on-failure");
    expect(config.reporter).toEqual([["html", { outputFolder: "qa/reports", open: "never" }]]);
    expect(config.outputDir).toBe("qa/test-results");
    expect(webServer).toMatchObject({
      command: "npm run dev",
      url: "http://127.0.0.1:9002",
      reuseExistingServer: false,
    });
    expect(webServer && !Array.isArray(webServer) ? webServer.env : undefined).toMatchObject({
      FIREBASE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
      FIREBASE_PROJECT_ID: "demo-coctels-e2e",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-coctels-e2e.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-coctels-e2e",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-coctels-e2e.firebasestorage.app",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:demo-coctels-e2e",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    });
  }, 30_000);

  it("usa los hosts públicos configurados para el servidor local", async () => {
    delete process.env.E2E_BASE_URL;
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:19099";
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST = "127.0.0.1:18080";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:19099";

    const config = await loadConfig();
    const webServer = config.webServer;

    expect(webServer && !Array.isArray(webServer) ? webServer.env : undefined).toMatchObject({
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
    });
  });

  it("conserva E2E_BASE_URL para ejecuciones externas", async () => {
    process.env.E2E_BASE_URL = "https://qa.example.test";

    const config = await loadConfig();

    expect(config.use?.baseURL).toBe("https://qa.example.test");
  });
});
