import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import Module from "node:module";

import { getLocalE2EStatePath } from "./e2e-local-state";

const emulatorProject = "demo-coctels-e2e";
const insideEmulators = process.argv.includes("--inside-emulators");

type Environment = NodeJS.ProcessEnv;

function commandName(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function run(command: string, args: string[], environment: Environment): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn(commandName(command), args, {
      env: environment,
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
    // El script local reutiliza el guard de servidor de Next sin modificar producción.
    if (request === "server-only") return {};
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    return await operation();
  } finally {
    moduleWithLoader._load = originalLoad;
  }
}

function localEnvironment(): Environment {
  const environment = { ...process.env };
  delete environment.E2E_BASE_URL;
  environment.FIREBASE_EMULATORS = "true";
  environment.NEXT_PUBLIC_FIREBASE_EMULATORS = "true";
  environment.FIREBASE_PROJECT_ID = emulatorProject;
  environment.E2E_CLEANUP = "true";
  environment.E2E_CLEANUP_CONFIRM = "DELETE_E2E_DATA";
  return environment;
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
  const environment = localEnvironment();
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
  const command = "npx tsx scripts/e2e-local-runner.ts --inside-emulators";
  const scriptArgument = process.platform === "win32" ? `"${command}"` : command;
  return run("firebase", [
    "emulators:exec",
    "--only",
    "auth,firestore",
    "--project",
    emulatorProject,
    scriptArgument,
  ], process.env);
}

async function main(): Promise<void> {
  const exitCode = insideEmulators ? await runInsideEmulators() : await runWithEmulators();
  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error("No fue posible ejecutar los E2E locales", error instanceof Error ? error.message : "Error desconocido");
  process.exitCode = 1;
});
