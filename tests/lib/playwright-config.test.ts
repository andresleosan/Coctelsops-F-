import { afterEach, describe, expect, it, vi } from "vitest";

const originalBaseURL = process.env.E2E_BASE_URL;

afterEach(() => {
  if (originalBaseURL === undefined) delete process.env.E2E_BASE_URL;
  else process.env.E2E_BASE_URL = originalBaseURL;
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
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    });
  });

  it("conserva E2E_BASE_URL para ejecuciones externas", async () => {
    process.env.E2E_BASE_URL = "https://qa.example.test";

    const config = await loadConfig();

    expect(config.use?.baseURL).toBe("https://qa.example.test");
  });
});
