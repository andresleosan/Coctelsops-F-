import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertLoopbackEmulatorHosts,
  getClientEmulatorHosts,
  shouldUseFirebaseEmulators,
} from "@/firebase/emulators";

const BASE_LOOPBACK = {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
} as const;

const adminMocks = vi.hoisted(() => ({
  cert: vi.fn(() => ({ credential: true })),
  getApps: vi.fn(() => []),
  initializeApp: vi.fn((options: unknown) => options),
  requireEnv: vi.fn((name: string) => {
    throw new Error(`credential lookup: ${name}`);
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("firebase-admin/app", () => ({
  cert: adminMocks.cert,
  getApps: adminMocks.getApps,
  initializeApp: adminMocks.initializeApp,
}));
vi.mock("@/lib/server-env", () => ({
  requireEnv: adminMocks.requireEnv,
}));

describe("shouldUseFirebaseEmulators", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_FIREBASE_EMULATORS;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
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

  it("returns true only when the flag is exactly 'true' and both hosts públicos are loopback", () => {
    expect(
      shouldUseFirebaseEmulators({
        NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
        NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
        NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      }),
    ).toBe(true);
  });

  it("permite al cliente usar solo hosts públicos loopback", () => {
    expect(shouldUseFirebaseEmulators({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "127.0.0.1:18080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:19099",
    })).toBe(true);
  });

  it("falla cerrado cuando faltan hosts públicos con la bandera activa", () => {
    expect(() => shouldUseFirebaseEmulators({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
    })).toThrow("loopback");
  });

  it("falla cerrado cuando un host público es inválido", () => {
    expect(() => shouldUseFirebaseEmulators({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "0.0.0.0:8080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toThrow("loopback");
  });

  it("falla cerrado cuando un host público es remoto", () => {
    expect(() => shouldUseFirebaseEmulators({
      NEXT_PUBLIC_FIREBASE_EMULATORS: "true",
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
    })).toThrow("loopback");
  });

  it("usa solamente hosts públicos y no lee variables privadas", () => {
    expect(() => getClientEmulatorHosts({
      FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "auth.example.com:9099",
    })).toThrow("loopback");
    expect(getClientEmulatorHosts({
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "localhost:18080",
      NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST: "localhost:19099",
    })).toEqual({
      firestore: { host: "localhost", port: 18080 },
      auth: { host: "localhost", port: 19099 },
    });
    expect(() => getClientEmulatorHosts({
      NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080",
    })).toThrow("loopback");
  });

  it("reads process.env when no environment is provided", () => {
    process.env.NEXT_PUBLIC_FIREBASE_EMULATORS = "true";
    process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
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

describe("getAdminApp en modo emulator", () => {
  afterEach(() => {
    delete process.env.FIREBASE_EMULATORS;
    delete process.env.FIRESTORE_EMULATOR_HOST;
    delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
    delete process.env.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
    vi.clearAllMocks();
  });

  it("falla cerrado con host remoto sin consultar credenciales", async () => {
    process.env.FIREBASE_EMULATORS = "true";
    process.env.FIRESTORE_EMULATOR_HOST = "firestore.example.com:8080";
    process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

    vi.resetModules();
    const { getAdminApp } = await import("@/lib/firebase-admin");

    expect(() => getAdminApp()).toThrow("loopback");
    expect(adminMocks.requireEnv).not.toHaveBeenCalled();
    expect(adminMocks.cert).not.toHaveBeenCalled();
    expect(adminMocks.initializeApp).not.toHaveBeenCalled();
  });
});
