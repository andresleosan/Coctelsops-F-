import { readFile } from "node:fs/promises";

import { getCatalogImportPath } from "@/lib/catalog/import-schema";
import { runCatalogImportCore, type CatalogImportReport } from "@/lib/catalog/import-core";
import { deleteProductImage, uploadLocalProductImage, validateLocalProductImage } from "@/lib/catalog/storage";
import { upsertImportedProduct } from "@/lib/firestore/products";

export type { CatalogImportReport } from "@/lib/catalog/import-core";

export async function runCatalogImport(options: { dryRun: boolean }): Promise<CatalogImportReport> {
  try {
    const content = await readFile(getCatalogImportPath(), "utf8");
    return runCatalogImportCore(JSON.parse(content), options, {
      validateLocalProductImage,
      uploadLocalProductImage,
      deleteLocalProductImage: deleteProductImage,
      upsertImportedProduct,
    });
  } catch (error) {
    return { products: 0, images: 0, created: 0, updated: 0, errors: [error instanceof Error ? error.message : "Error desconocido"] };
  }
}
