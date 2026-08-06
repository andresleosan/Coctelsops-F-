import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  createFirebaseEmulatorConfig,
  createLocalE2EEnvironment,
  findFreeLoopbackPort,
  acquireE2ERunnerLock,
} from "../../scripts/e2e-local-runner";

describe("runner E2E local", () => {
  it("elige un puerto loopback libre", async () => {
    const port = await findFreeLoopbackPort();

    expect(port).toBeGreaterThanOrEqual(1);
    expect(port).toBeLessThanOrEqual(65_535);
  });

  it("propaga hosts privados y públicos con los puertos reservados", () => {
    const environment = createLocalE2EEnvironment({}, {
      firestore: 18_080,
      auth: 19_099,
    });

    expect(environment).toMatchObject({
      FIREBASE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
      FIREBASE_PROJECT_ID: "demo-coctels-e2e",
      NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-coctels-e2e.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-coctels-e2e",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-coctels-e2e.firebasestorage.app",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:demo-coctels-e2e",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
    });
    expect(environment.E2E_BASE_URL).toBeUndefined();
  });

  it("genera configuración temporal con reglas e índices del repositorio", () => {
    const config = createFirebaseEmulatorConfig({
      firestore: 18_080,
      auth: 19_099,
    });

    expect(config.firestore).toEqual({
      rules: expect.stringMatching(/[\\/]firestore\.rules$/),
      indexes: expect.stringMatching(/[\\/]firestore\.indexes\.json$/),
    });
    expect(config.emulators).toEqual({
      auth: { host: "127.0.0.1", port: 19_099 },
      firestore: { host: "127.0.0.1", port: 18_080 },
      singleProjectMode: true,
    });
  });

  it("impide dos runners simultáneos y libera el lock al terminar", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "coctels-e2e-lock-"));
    const lockPath = path.join(directory, "runner.lock");
    const first = acquireE2ERunnerLock(lockPath);

    expect(() => acquireE2ERunnerLock(lockPath)).toThrow("runner E2E local");
    first.dispose();

    const second = acquireE2ERunnerLock(lockPath);
    second.dispose();
    rmSync(directory, { recursive: true, force: true });
  });
});
