import { parseCatalogImport, type CatalogImportRecord } from "@/lib/catalog/import-schema";
import type { ProductInput } from "@/types/catalog";

export type CatalogImportReport = {
  products: number;
  images: number;
  created: number;
  updated: number;
  errors: string[];
};

export type CatalogImportAdapters = {
  validateLocalProductImage: (imageFile: string) => Promise<void>;
  uploadLocalProductImage: (imageFile: string, productId: string) => Promise<string>;
  upsertImportedProduct?: (id: string, input: ProductInput, actorUid: string) => Promise<"created" | "updated">;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Error desconocido";
}

export async function runCatalogImportCore(
  input: unknown,
  options: { dryRun: boolean },
  adapters: CatalogImportAdapters,
): Promise<CatalogImportReport> {
  let records: CatalogImportRecord[];
  try {
    records = parseCatalogImport(input);
  } catch (error) {
    return { products: 0, images: 0, created: 0, updated: 0, errors: [errorMessage(error)] };
  }

  const errors: string[] = [];
  for (const record of records) {
    try {
      await adapters.validateLocalProductImage(record.imageFile);
    } catch (error) {
      errors.push(`${record.id}: ${errorMessage(error)}`);
    }
  }

  if (errors.length > 0 || options.dryRun) {
    return { products: records.length, images: 0, created: 0, updated: 0, errors };
  }

  if (!adapters.upsertImportedProduct) throw new Error("Falta el adaptador de escritura del catálogo");
  let images = 0;
  let created = 0;
  let updated = 0;
  for (const record of records) {
    try {
      const image = await adapters.uploadLocalProductImage(record.imageFile, record.id);
      images += 1;
      const result = await adapters.upsertImportedProduct(record.id, { ...record.product, image }, "catalog-import");
      if (result === "created") created += 1;
      else updated += 1;
    } catch (error) {
      errors.push(`${record.id}: ${errorMessage(error)}`);
    }
  }

  return { products: records.length, images, created, updated, errors };
}
