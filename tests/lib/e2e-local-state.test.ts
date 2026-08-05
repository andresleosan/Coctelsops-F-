import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  createLocalE2EPassword,
  createLocalE2EState,
} from "../../scripts/e2e-local-state";
import { cleanupLocalE2EState } from "../../scripts/e2e-local-cleanup";
import { loadLocalE2EState } from "../e2e/local-state";

const originalEnvironment = { ...process.env };

afterEach(() => {
  for (const name of Object.keys(process.env)) {
    if (!(name in originalEnvironment)) delete process.env[name];
  }
  for (const [name, value] of Object.entries(originalEnvironment)) {
    process.env[name] = value;
  }
});

describe("estado E2E local", () => {
  it("genera correos con timestamp y dominio local.test", () => {
    const state = createLocalE2EState(1_700_000_000_000);

    expect(state.customer.email).toMatch(/^customer-1700000000000-[a-f0-9]+@local\.test$/);
    expect(state.staff.email).toMatch(/^staff-1700000000000-[a-f0-9]+@local\.test$/);
    expect(state.admin.email).toMatch(/^admin-1700000000000-[a-f0-9]+@local\.test$/);
  });

  it("genera contraseñas no vacías y aptas para Firebase Auth", () => {
    const passwords = [createLocalE2EPassword(), createLocalE2EPassword()];

    expect(passwords.every((password) => password.length >= 12)).toBe(true);
    expect(passwords[0]).not.toBe(passwords[1]);
  });

  it("no incluye credenciales reales en los archivos del setup", () => {
    const files = [
      "scripts/e2e-local-state.ts",
      "scripts/e2e-local-cleanup.ts",
      "tests/e2e/local-state.ts",
    ];
    const forbidden = [
      "-----BEGIN PRIVATE KEY-----",
      "FIREBASE_PRIVATE_KEY=",
      "client_email:",
      "firebaseio.com",
    ];

    for (const file of files) {
      const contents = readFileSync(path.resolve(process.cwd(), file), "utf8");
      for (const value of forbidden) {
        expect(contents, `${file} contiene ${value}`).not.toContain(value);
      }
    }
  });

  it("carga solamente el archivo indicado por E2E_STATE_FILE", () => {
    const directory = mkdtempSync(path.join(os.tmpdir(), "coctels-e2e-state-"));
    const stateFile = path.join(directory, "state.json");
    const state = createLocalE2EState(1_700_000_000_000);
    writeFileSync(stateFile, JSON.stringify(state), "utf8");
    process.env.E2E_STATE_FILE = stateFile;

    expect(loadLocalE2EState()).toEqual(state);
    rmSync(directory, { recursive: true, force: true });
  });

  it("rechaza cleanup si algún host no es loopback y no borra", async () => {
    process.env.E2E_CLEANUP = "true";
    process.env.E2E_CLEANUP_CONFIRM = "DELETE_E2E_DATA";
    process.env.FIREBASE_EMULATORS = "true";
    process.env.FIREBASE_PROJECT_ID = "coctels-test";
    process.env.FIRESTORE_EMULATOR_HOST = "firestore.example.com:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

    await expect(cleanupLocalE2EState(createLocalE2EState(1_700_000_000_000))).rejects.toThrow("loopback");
  });
});
