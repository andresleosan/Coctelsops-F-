type CleanupEnvironment = Record<string, string | undefined>;

function isLoopbackEmulatorHost(value: string | undefined): boolean {
  const match = /^(localhost|127\.0\.0\.1):(\d+)$/.exec(value?.trim() ?? "");
  if (!match) return false;

  const port = Number.parseInt(match[2], 10);
  return Number.isInteger(port) && port >= 1 && port <= 65_535;
}

export function getCleanupSafetyError(environment: CleanupEnvironment): string | undefined {
  if (environment.E2E_CLEANUP !== "true") return undefined;
  if (environment.E2E_CLEANUP_CONFIRM !== "DELETE_E2E_DATA") {
    return "E2E_CLEANUP_CONFIRM debe ser DELETE_E2E_DATA para habilitar la limpieza.";
  }
  if (!environment.FIRESTORE_EMULATOR_HOST || !environment.FIREBASE_AUTH_EMULATOR_HOST) {
    return "La limpieza E2E requiere FIRESTORE_EMULATOR_HOST y FIREBASE_AUTH_EMULATOR_HOST.";
  }
  if (!isLoopbackEmulatorHost(environment.FIRESTORE_EMULATOR_HOST) || !isLoopbackEmulatorHost(environment.FIREBASE_AUTH_EMULATOR_HOST)) {
    return "La limpieza E2E solo acepta hosts de emulador loopback (localhost o 127.0.0.1).";
  }
  if (!environment.FIREBASE_PROJECT_ID?.trim()) {
    return "La limpieza E2E requiere FIREBASE_PROJECT_ID para inicializar el emulador.";
  }
  return undefined;
}
