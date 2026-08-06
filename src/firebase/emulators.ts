const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);
const PORT_MIN = 1;
const PORT_MAX = 65535;
export const DEFAULT_FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
export const DEFAULT_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

const EMULATOR_HOST_VARS = [
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
] as const;

function parseLoopbackPort(host: string | undefined): boolean {
  const value = host?.trim();
  if (!value) {
    return false;
  }

  const colonIndex = value.lastIndexOf(":");
  if (colonIndex <= 0 || colonIndex === value.length - 1) {
    return false;
  }

  const hostname = value.slice(0, colonIndex);
  const portString = value.slice(colonIndex + 1);

  if (!LOOPBACK_HOSTS.has(hostname)) {
    return false;
  }

  if (!/^\d+$/.test(portString)) {
    return false;
  }

  const port = Number.parseInt(portString, 10);
  if (!Number.isFinite(port) || port < PORT_MIN || port > PORT_MAX) {
    return false;
  }

  return true;
}

function parseEmulatorHost(value: string): { host: "localhost" | "127.0.0.1"; port: number } {
  const normalized = value.trim();
  const colonIndex = normalized.lastIndexOf(":");
  const host = normalized.slice(0, colonIndex);
  const port = Number.parseInt(normalized.slice(colonIndex + 1), 10);
  if (host !== "localhost" && host !== "127.0.0.1") {
    throw new Error("El host del emulador debe ser loopback.");
  }
  return { host, port };
}

export function assertLoopbackEmulatorHosts(
  environment: Record<string, string | undefined>,
): void {
  for (const name of EMULATOR_HOST_VARS) {
    const value = environment[name];
    if (!parseLoopbackPort(value)) {
      throw new Error(
        `El host ${name} debe ser loopback (localhost o 127.0.0.1) con puerto entre 1 y 65535. Valor recibido: "${value ?? ""}"`,
      );
    }
  }
}

export function getClientEmulatorHosts(
  environment: Record<string, string | undefined> = process.env,
): {
  firestore: { host: "localhost" | "127.0.0.1"; port: number };
  auth: { host: "localhost" | "127.0.0.1"; port: number };
} {
  const firestoreHost = environment.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST
    ?? environment.FIRESTORE_EMULATOR_HOST
    ?? DEFAULT_FIRESTORE_EMULATOR_HOST;
  const authHost = environment.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST
    ?? environment.FIREBASE_AUTH_EMULATOR_HOST
    ?? DEFAULT_AUTH_EMULATOR_HOST;
  const hosts = {
    FIRESTORE_EMULATOR_HOST: firestoreHost,
    FIREBASE_AUTH_EMULATOR_HOST: authHost,
  };

  assertLoopbackEmulatorHosts(hosts);
  return {
    firestore: parseEmulatorHost(firestoreHost),
    auth: parseEmulatorHost(authHost),
  };
}

export function shouldUseFirebaseEmulators(
  environment: Record<string, string | undefined> | undefined = process.env,
): boolean {
  const env = environment ?? process.env;

  if (env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "true") {
    return false;
  }

  try {
    getClientEmulatorHosts(env);
  } catch {
    return false;
  }

  return true;
}
