import { afterEach, describe, expect, it } from "vitest";
import {
  assertLoopbackEmulatorHosts,
  shouldUseFirebaseEmulators,
} from "@/firebase/emulators";

const BASE_LOOPBACK = {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
} as const;

describe("shouldUseFirebaseEmulators", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FIREBASE_EMULATORS;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  });

  it("requires the explicit client flag set to true", () => {
    expect(
      shouldUseFirebaseEmulators({
        NEXT_PUBLIC_FIREBASE_EMULATORS: "false",
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toBe(false);
  });

  it("returns false when the client flag is missing", () => {
    expect(shouldUseFirebaseEmulators({ ...BASE_LOOPBACK })).toBe(false);
  });

  it("returns true only when the flag is exactly 'true' and both hosts are loopback", () => {
    expect(
      shouldUseFirebaseEmulators({
        NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
        ...BASE_LOOPBACK,
      }),
    ).toBe(true);
  });

  it("returns false when a loopback host is invalid", () => {
    expect(
      shouldUseFirebaseEmulators({
        NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
        FIRESTORE_EMULATOR_HOST: "0.0.0.0:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toBe(false);
  });

  it("reads process.env when no environment is provided", () => {
    process.env.NEXT_PUBLIC_FIREBASE_EMULATORS = "true";
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
    expect(shouldUseFirebaseEmulators()).toBe(true);
  });
});

describe("assertLoopbackEmulatorHosts", () => {
  it("accepts 127.0.0.1 with a valid port", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).not.toThrow();
  });

  it("accepts localhost with a valid port", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "localhost:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
      }),
    ).not.toThrow();
  });

  it("rejects a non-loopback host mentioning loopback", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "localhost:9099",
      }),
    ).toThrow("loopback");
  });

  it("rejects 0.0.0.0 mentioning loopback", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "0.0.0.0:8080",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toThrow("loopback");
  });

  it("rejects a port out of range mentioning loopback", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:0",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toThrow("loopback");
  });

  it("rejects a port above 65535 mentioning loopback", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:70000",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toThrow("loopback");
  });

  it("rejects a host without port mentioning loopback", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "127.0.0.1",
        FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toThrow("loopback");
  });

  it("rejects when the auth host is missing mentioning loopback", () => {
    expect(() =>
      assertLoopbackEmulatorHosts({
        FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      }),
    ).toThrow("loopback");
  });
});
