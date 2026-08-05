import { describe, expect, it } from "vitest";

import { getCleanupSafetyError } from "../e2e/cleanup-safety";

const confirmedCleanup = {
  E2E_CLEANUP: "true",
  E2E_CLEANUP_CONFIRM: "DELETE_E2E_DATA",
  FIREBASE_PROJECT_ID: "coctels-test",
};

describe("E2E cleanup safety", () => {
  it("refuses cleanup when emulator hosts are absent", () => {
    expect(getCleanupSafetyError(confirmedCleanup)).toContain("FIRESTORE_EMULATOR_HOST");
  });

  it("refuses cleanup when an emulator host is not loopback", () => {
    expect(getCleanupSafetyError({
      ...confirmedCleanup,
      FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    })).toContain("loopback");
  });

  it("requires an explicit cleanup confirmation", () => {
    expect(getCleanupSafetyError({
      ...confirmedCleanup,
      E2E_CLEANUP_CONFIRM: "yes",
      FIRESTORE_EMULATOR_HOST: "localhost:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    })).toContain("E2E_CLEANUP_CONFIRM");
  });

  it("allows only explicitly confirmed local emulators", () => {
    expect(getCleanupSafetyError({
      ...confirmedCleanup,
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
    })).toBeUndefined();
  });
});
