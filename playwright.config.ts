import { defineConfig } from "@playwright/test";

const localBaseURL = "http://127.0.0.1:9002";
const baseURL = process.env.E2E_BASE_URL ?? localBaseURL;
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080";
const authEmulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const localEmulatorEnvironment = {
  ...process.env,
  FIREBASE_EMULATORS: "true",
  NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
  FIREBASE_PROJECT_ID: "demo-coctels-e2e",
  FIRESTORE_EMULATOR_HOST: firestoreEmulatorHost,
  FIREBASE_AUTH_EMULATOR_HOST: authEmulatorHost,
  NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST ?? firestoreEmulatorHost,
  NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? authEmulatorHost,
};

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "qa/test-results",
  reporter: [["html", { outputFolder: "qa/reports", open: "never" }]],
  workers: 1,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: "npm run dev",
    url: localBaseURL,
    reuseExistingServer: false,
    env: localEmulatorEnvironment,
  },
});
