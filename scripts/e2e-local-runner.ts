import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, rmSync, unlinkSync, writeFileSync, writeSync } from "node:fs";
import Module from "node:module";
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

export type E2ERunnerLock = {
  dispose: () => void;
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

function quoteWindowsCommandArgument(value: string): string {
  if (/^[a-zA-Z0-9_./,:\\-]+$/.test(value)) return value;
  return `"${value.replace(/["^]/g, (character) => `^${character}`)}"`;
}

export function acquireE2ERunnerLock(
  lockPath = path.resolve(process.cwd(), ".tmp/e2e/local-emulator.lock"),
): E2ERunnerLock {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  let descriptor: number | undefined;
  let created = false;
  try {
    descriptor = openSync(lockPath, "wx", 0o600);
    created = true;
    writeSync(descriptor, `${process.pid}\n`, undefined, "utf8");
    closeSync(descriptor);
  } catch (error: unknown) {
    try {
      if (descriptor !== undefined) closeSync(descriptor);
      if (created) unlinkSync(lockPath);
    } catch {
      // No sobrescribir el error original ni tocar un lock ajeno.
    }
    if ((error as { code?: string }).code === "EEXIST") {
      throw new Error("Ya existe un runner E2E local activo; espera a que termine.");
    }
    throw error;
  }

  let disposed = false;
  return {
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unlinkSync(lockPath);
    },
  };
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

function createTemporaryFirebaseConfig(ports: LocalEmulatorPorts): { filePath: string; scriptPath: string; dispose: () => void } {
  const temporaryRoot = path.resolve(process.cwd(), ".tmp/e2e");
  mkdirSync(temporaryRoot, { recursive: true });
  const directory = mkdtempSync(path.join(temporaryRoot, "firebase-"));
  const absoluteConfigPath = path.join(directory, "firebase.json");
  const absoluteScriptPath = path.join(directory, "run-e2e.cmd");
  writeFileSync(absoluteConfigPath, `${JSON.stringify(createFirebaseEmulatorConfig(ports), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  writeFileSync(absoluteScriptPath, "@echo off\r\ncall npx tsx scripts/e2e-local-runner.ts --inside-emulators\r\nexit /b %errorlevel%\r\n", {
    encoding: "utf8",
    mode: 0o700,
  });

  return {
    filePath: path.relative(process.cwd(), absoluteConfigPath),
    scriptPath: path.relative(process.cwd(), absoluteScriptPath),
    dispose: () => rmSync(directory, { recursive: true, force: true }),
  };
}

function run(command: string, args: string[], environment: Environment): Promise<number> {
  return new Promise((resolve, reject) => {
    const executable = process.platform === "win32" ? process.env.ComSpec ?? "cmd.exe" : commandName(command);
    const spawnArgs = process.platform === "win32"
      // Los .cmd requieren cmd.exe en Windows; shell:false evita la concatenación implícita de Node.
      ? ["/d", "/c", `call ${[commandName(command), ...args].map(quoteWindowsCommandArgument).join(" ")}`]
      : args;
    const child = spawn(executable, spawnArgs, {
      env: environment as NodeJS.ProcessEnv,
      stdio: "inherit",
      shell: false,
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
  const lock = acquireE2ERunnerLock();
  let temporaryConfig: { filePath: string; scriptPath: string; dispose: () => void } | undefined;
  try {
    const firestorePort = await findFreeLoopbackPort();
    const authPort = await findFreeLoopbackPort([firestorePort]);
    const environment = createLocalE2EEnvironment(process.env, {
      firestore: firestorePort,
      auth: authPort,
    });
    temporaryConfig = createTemporaryFirebaseConfig({
      firestore: firestorePort,
      auth: authPort,
    });
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
      process.platform === "win32" ? temporaryConfig.scriptPath : "npx tsx scripts/e2e-local-runner.ts --inside-emulators",
    ], environment);
  } finally {
    temporaryConfig?.dispose();
    lock.dispose();
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
