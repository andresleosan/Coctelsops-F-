import { readFile } from "node:fs/promises";

import { getCatalogImportPath, parseCatalogImport } from "@/lib/catalog/import-schema";
import { uploadLocalProductImage, validateLocalProductImage } from "@/lib/catalog/storage";
import { upsertImportedProduct } from "@/lib/firestore/products";

export type CatalogImportReport = {
  products: number;
  images: number;
  created: number;
  updated: number;
  errors: string[];
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido";
}

export async function runCatalogImport(options: { dryRun: boolean }): Promise<CatalogImportReport> {
  let records;
  try {
    const content = await readFile(getCatalogImportPath(), "utf8");
    records = parseCatalogImport(JSON.parse(content));
  } catch (error) {
    return { products: 0, images: 0, created: 0, updated: 0, errors: [errorMessage(error)] };
  }

  const errors: string[] = [];
  for (const record of records) {
    try {
      await validateLocalProductImage(record.imageFile);
    } catch (error) {
      errors.push(`${record.id}: ${errorMessage(error)}`);
    }
  }

  if (errors.length > 0 || options.dryRun) {
    return { products: records.length, images: 0, created: 0, updated: 0, errors };
  }

  let images = 0;
  let created = 0;
  let updated = 0;
  for (const record of records) {
    try {
      const image = await uploadLocalProductImage(record.imageFile, record.id);
      images += 1;
      const result = await upsertImportedProduct(record.id, { ...record.product, image }, "catalog-import");
      if (result === "created") created += 1;
      else updated += 1;
    } catch (error) {
      errors.push(`${record.id}: ${errorMessage(error)}`);
    }
  }

  return { products: records.length, images, created, updated, errors };
}
