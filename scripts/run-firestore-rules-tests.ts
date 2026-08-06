import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectId = "demo-coctels-e2e";
const testFile = "tests/firestore-rules-emulator.test.ts";
const useExistingEmulator = process.argv.includes("--use-existing-emulator")
  || process.env.FIRESTORE_RULES_USE_EXISTING_EMULATOR === "true";

type EmulatorConfig = {
  firestore: {
    rules: string;
    indexes: string;
  };
  emulators: {
    firestore: {
      host: "127.0.0.1";
      port: number;
    };
    singleProjectMode: true;
  };
};

function commandName(command: string): string {
  return process.platform === "win32" ? `${command}.cmd` : command;
}

function quoteWindowsArgument(value: string): string {
  if (/^[a-zA-Z0-9_./,:\\-]+$/.test(value)) return value;
  return `"${value.replace(/["^]/g, (character) => `^${character}`)}"`;
}

function run(command: string, args: string[], environment: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const executable = isWindows ? process.env.ComSpec ?? "cmd.exe" : commandName(command);
    const spawnArgs = isWindows
      ? ["/d", "/c", `call ${[commandName(command), ...args].map(quoteWindowsArgument).join(" ")}`]
      : args;
    const child = spawn(executable, spawnArgs, {
      env: environment,
      shell: false,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

function findFreeLoopbackPort(): Promise<number> {
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

      server.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

function assertLoopbackHost(host: string | undefined): string {
  const match = /^(localhost|127\.0\.0\.1):(\d+)$/.exec(host ?? "");
  const port = match ? Number(match[2]) : 0;
  if (!match || port < 1 || port > 65_535) {
    throw new Error("FIRESTORE_EMULATOR_HOST debe ser un host loopback con puerto valido.");
  }
  return host as string;
}

function createEmulatorConfig(port: number): EmulatorConfig {
  return {
    firestore: {
      rules: path.resolve(process.cwd(), "firestore.rules"),
      indexes: path.resolve(process.cwd(), "firestore.indexes.json"),
    },
    emulators: {
      firestore: { host: "127.0.0.1", port },
      singleProjectMode: true,
    },
  };
}

function testEnvironment(host: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    FIRESTORE_EMULATOR_HOST: host,
    FIRESTORE_RULES_EMULATOR: "true",
  };
}

async function runAgainstExistingEmulator(): Promise<number> {
  const host = assertLoopbackHost(process.env.FIRESTORE_EMULATOR_HOST);
  return run("npx", ["vitest", "run", testFile], testEnvironment(host));
}

async function runWithTemporaryEmulator(): Promise<number> {
  const port = await findFreeLoopbackPort();
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "coctels-firestore-rules-"));
  const configPath = path.join(temporaryDirectory, "firebase.json");
  const scriptPath = path.join(temporaryDirectory, "run-rules.cmd");
  writeFileSync(configPath, `${JSON.stringify(createEmulatorConfig(port), null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  if (process.platform === "win32") {
    writeFileSync(scriptPath, "@echo off\r\ncall npx vitest run tests/firestore-rules-emulator.test.ts\r\nexit /b %errorlevel%\r\n", {
      encoding: "utf8",
      mode: 0o700,
    });
  }

  try {
    return await run(
      "firebase",
      [
        "--config",
        configPath,
        "--project",
        projectId,
        "emulators:exec",
        "--only",
        "firestore",
        process.platform === "win32" ? scriptPath : `npx vitest run ${testFile}`,
      ],
      testEnvironment(`127.0.0.1:${port}`),
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const exitCode = useExistingEmulator
    ? await runAgainstExistingEmulator()
    : await runWithTemporaryEmulator();
  process.exitCode = exitCode;
}

main().catch((error: unknown) => {
  console.error("No fue posible ejecutar las reglas Firestore en el emulator", error instanceof Error ? error.message : "Error desconocido");
  process.exitCode = 1;
});
