import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import Module from "node:module";
import os from "node:os";
import path from "node:path";

import { getLocalE2EStatePath } from "./e2e-local-state";

const emulatorProject = "demo-coctels-e2e";
const insideEmulators = process.argv.includes("--inside-emulators");
const defaultFirestoreHost = "127.0.0.1:8080";
const defaultAuthHost = "127.0.0.1:9099";

type Environment = Record<string, string | undefined>;

export type LocalEmulatorPorts = {
  firestore: number;
  auth: number;
};

type FirebaseEmulatorConfig = {
  firestore: {
    rules: string;
    indexes: string;
  };
  emulators: {
    auth: { host: "127.0.0.1"; port: number };
    firestore: { host: "127.0.0.1"; port: number };
    singleProjectMode: true;
  };
};

function commandName(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

export function findFreeLoopbackPort(excludedPorts: readonly number[] = []): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("No fue posible obtener un puerto loopback libre."));
        return;
      }

      const port = address.port;
      server.close((error) => {
        if (error) {
          reject(error);
        } else if (excludedPorts.includes(port)) {
          findFreeLoopbackPort(excludedPorts).then(resolve, reject);
        } else {
          resolve(port);
        }
      });
    });
  });
}

export function createLocalE2EEnvironment(
  baseEnvironment: Environment,
  ports?: LocalEmulatorPorts,
): Environment {
  const environment = { ...baseEnvironment };
  delete environment.E2E_BASE_URL;
  environment.FIREBASE_EMULATORS = "true";
  environment.NEXT_PUBLIC_FIREBASE_EMULATORS = "true";
  environment.FIREBASE_PROJECT_ID = emulatorProject;
  environment.E2E_CLEANUP = "true";
  environment.E2E_CLEANUP_CONFIRM = "DELETE_E2E_DATA";

  const firestoreHost = ports ? `127.0.0.1:${ports.firestore}` : environment.FIRESTORE_EMULATOR_HOST ?? defaultFirestoreHost;
  const authHost = ports ? `127.0.0.1:${ports.auth}` : environment.FIREBASE_AUTH_EMULATOR_HOST ?? defaultAuthHost;
  environment.FIRESTORE_EMULATOR_HOST = firestoreHost;
  environment.FIREBASE_AUTH_EMULATOR_HOST = authHost;
  environment.NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST = firestoreHost;
  environment.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST = authHost;
  return environment;
}

export function createFirebaseEmulatorConfig(ports: LocalEmulatorPorts): FirebaseEmulatorConfig {
  return {
    firestore: {
      rules: path.resolve(process.cwd(), "firestore.rules"),
      indexes: path.resolve(process.cwd(), "firestore.indexes.json"),
    },
    emulators: {
      auth: { host: "127.0.0.1", port: ports.auth },
      firestore: { host: "127.0.0.1", port: ports.firestore },
      singleProjectMode: true,
    },
  };
}

function createTemporaryFirebaseConfig(ports: LocalEmulatorPorts): { filePath: string; dispose: () => void } {
  const directory = mkdtempSync(path.join(os.tmpdir(), "coctels-e2e-firebase-"));
  const filePath = path.join(directory, "firebase.json");
  writeFileSync(filePath, `${JSON.stringify(createFirebaseEmulatorConfig(ports), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });

  return {
    filePath,
    dispose: () => rmSync(directory, { recursive: true, force: true }),
  };
}

function run(command: string, args: string[], environment: Environment): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName(command), args, {
      env: environment as NodeJS.ProcessEnv,
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

async function runServerOnlySafe<T>(operation: () => Promise<T>): Promise<T> {
  type ModuleWithLoader = typeof Module & {
    _load(request: string, parent: NodeModule | null, isMain: boolean): unknown;
  };
  const moduleWithLoader = Module as ModuleWithLoader;
  const originalLoad = moduleWithLoader._load;
  moduleWithLoader._load = function load(request: string, parent: NodeModule | null, isMain: boolean) {
    // El script local reutiliza el guard de servidor de Next sin modificar produccion.
    if (request === "server-only") return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return await operation();
  } finally {
    moduleWithLoader._load = originalLoad;
  }
}

function applyEnvironment(environment: Environment): () => void {
  const originalEnvironment = { ...process.env };
  for (const name of Object.keys(process.env)) delete process.env[name];
  Object.assign(process.env, environment);

  return () => {
    for (const name of Object.keys(process.env)) delete process.env[name];
    Object.assign(process.env, originalEnvironment);
  };
}

async function runInsideEmulators(): Promise<number> {
  const { cleanupLocalE2EState } = await import("./e2e-local-cleanup");
  const { prepareLocalE2EState } = await import("./e2e-local-state");
  const environment = createLocalE2EEnvironment(process.env);
  const restoreEnvironment = applyEnvironment(environment);
  let exitCode = 1;

  try {
    await runServerOnlySafe(() => prepareLocalE2EState());
    exitCode = await run("npx", ["playwright", "test"], environment);
  } finally {
    if (existsSync(getLocalE2EStatePath(environment))) {
      try {
        await runServerOnlySafe(async () => cleanupLocalE2EState(await requireLocalE2EState()));
      } catch (error: unknown) {
        console.error("No fue posible limpiar el estado E2E local", error instanceof Error ? error.message : "Error desconocido");
        if (exitCode === 0) exitCode = 1;
      }
    }
    restoreEnvironment();
  }

  return exitCode;
}

async function requireLocalE2EState() {
  const { loadLocalE2EState } = await import("../tests/e2e/local-state");
  const state = loadLocalE2EState();
  if (!state) throw new Error("No existe un estado E2E local para limpiar.");
  return state;
}

async function runWithEmulators(): Promise<number> {
  const firestorePort = await findFreeLoopbackPort();
  const authPort = await findFreeLoopbackPort([firestorePort]);
  const environment = createLocalE2EEnvironment(process.env, {
    firestore: firestorePort,
    auth: authPort,
  });
  const temporaryConfig = createTemporaryFirebaseConfig({
    firestore: firestorePort,
    auth: authPort,
  });
  const command = "npx tsx scripts/e2e-local-runner.ts --inside-emulators";
  const scriptArgument = process.platform === "win32" ? `"${command}"` : command;
  try {
    return await run("firebase", [
      "emulators:exec",
      "--config",
      temporaryConfig.filePath,
      "--log-verbosity",
      "QUIET",
      "--only",
      "auth,firestore",
      "--project",
      emulatorProject,
      scriptArgument,
    ], environment);
  } finally {
    temporaryConfig.dispose();
  }
}

async function main(): Promise<void> {
  const exitCode = insideEmulators ? await runInsideEmulators() : await runWithEmulators();
  process.exitCode = exitCode;
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error("No fue posible ejecutar los E2E locales", error instanceof Error ? error.message : "Error desconocido");
    process.exitCode = 1;
  });
}
