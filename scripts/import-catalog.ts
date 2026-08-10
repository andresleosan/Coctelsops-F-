import { readFile } from "node:fs/promises";

import { getCatalogImportPath } from "../src/lib/catalog/import-schema";
import { runCatalogImportCore, type CatalogImportAdapters, type CatalogImportReport } from "../src/lib/catalog/import-core";
import { readValidatedLocalProductImage } from "../src/lib/catalog/local-images";

export async function runCliCatalogImport(options: { dryRun: boolean }): Promise<CatalogImportReport> {
  let input: unknown;
  try {
    const manifestPath = process.env.CATALOG_IMPORT_PATH?.trim() || getCatalogImportPath();
    input = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    return { products: 0, images: 0, created: 0, updated: 0, errors: [error instanceof Error ? error.message : "Error desconocido"] };
  }

  const localImages = new Map<string, Awaited<ReturnType<typeof readValidatedLocalProductImage>>>();
  const adapters: CatalogImportAdapters = {
    validateLocalProductImage: async (imageFile) => {
      localImages.set(imageFile, await readValidatedLocalProductImage(imageFile));
    },
    uploadLocalProductImage: async (imageFile, productId) => {
      const image = localImages.get(imageFile) ?? await readValidatedLocalProductImage(imageFile);
      const adapter = await import("./catalog/import-adapter");
      return adapter.uploadProductImageBytes(image, productId);
    },
    deleteLocalProductImage: async (key) => {
      const adapter = await import("./catalog/import-adapter");
      await adapter.deleteProductImage(key);
    },
  };

  if (!options.dryRun) {
    const adapter = await import("./catalog/import-adapter");
    adapters.upsertImportedProduct = adapter.upsertImportedProduct;
  }

  return runCatalogImportCore(input, options, adapters);
}

async function main(): Promise<void> {
  const report = await runCliCatalogImport({ dryRun: !process.argv.includes("--write") });
  console.log(JSON.stringify(report));
  if (report.errors.length > 0) process.exitCode = 1;
}

void main();
