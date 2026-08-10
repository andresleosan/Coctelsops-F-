import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, mkdir, mkdtemp, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

const worktree = process.cwd();

function runCli(environment: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "scripts/import-catalog.ts", "--dry-run"], { cwd: worktree, env: environment });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString(); });
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("CLI de importación de catálogo", () => {
  it("ejecuta dry-run con un manifiesto local sin cargar server-only ni escribir", async () => {
    const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), "catalog-cli-"));
    const manifestPath = path.join(temporaryDirectory, "products.json");
    const imagesDirectory = path.join(worktree, "scripts/catalog/images");
    const hadImagesDirectory = await access(imagesDirectory).then(() => true).catch(() => false);
    await mkdir(imagesDirectory, { recursive: true });
    const imageFile = `cli-smoke-${randomUUID()}.png`;
    const imagePath = path.join(imagesDirectory, imageFile);
    const manifest = [{
      id: "cli-smoke",
      imageFile,
      product: {
        name: "CLI Smoke",
        description: "Producto sintético de prueba.",
        price: 1000,
        category: "granizado",
        availableFlavors: [],
        availableAddOns: [],
        stock: 0,
        active: true,
        featured: false,
      },
    }];

    await writeFile(manifestPath, JSON.stringify(manifest));
    await writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

    try {
      const result = await runCli({ ...process.env, CATALOG_IMPORT_PATH: manifestPath });

      expect(result.code).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ products: 1, images: 0, created: 0, updated: 0, errors: [] });
      expect(result.stderr).toBe("");
    } finally {
      await unlink(imagePath).catch(() => undefined);
      if (!hadImagesDirectory) await rm(imagesDirectory, { recursive: true, force: true });
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
