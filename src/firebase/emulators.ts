const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);
const PORT_MIN = 1;
const PORT_MAX = 65535;

const EMULATOR_HOST_VARS = [
  "FIRESTORE_EMULATOR_HOST",
  "FIREBASE_AUTH_EMULATOR_HOST",
] as const;

function parseLoopbackPort(host: string | undefined): boolean {
  if (!host) {
    return false;
  }

  const colonIndex = host.lastIndexOf(":");
  if (colonIndex <= 0 || colonIndex === host.length - 1) {
    return false;
  }

  const hostname = host.slice(0, colonIndex);
  const portString = host.slice(colonIndex + 1);

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

export function shouldUseFirebaseEmulators(
  environment: Record<string, string | undefined> | undefined = process.env,
): boolean {
  const env = environment ?? process.env;

  if (env.NEXT_PUBLIC_FIREBASE_EMULATORS !== "true") {
    return false;
  }

  try {
    assertLoopbackEmulatorHosts(env);
  } catch {
    return false;
  }

  return true;
}
