import { existsSync, readFileSync } from "node:fs";

import {
  getLocalE2EStatePath,
  isLocalE2EState,
  type LocalE2EState,
} from "../../scripts/e2e-local-state";

export function shouldUseLocalE2EState(environment: Record<string, string | undefined> = process.env): boolean {
  return environment.NEXT_PUBLIC_FIREBASE_EMULATORS === "true" && environment.E2E_BASE_URL === undefined;
}

export function loadLocalE2EState(): LocalE2EState | undefined {
  const stateFile = getLocalE2EStatePath();
  if (!existsSync(stateFile)) return undefined;

  const parsed: unknown = JSON.parse(readFileSync(stateFile, "utf8"));
  if (!isLocalE2EState(parsed)) {
    throw new Error(`El archivo de estado E2E no tiene el formato esperado: ${stateFile}`);
  }
  return parsed;
}
