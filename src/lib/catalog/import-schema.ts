import { z } from "zod";

import { isAllowedCatalogImage } from "@/lib/catalog/image-hosts";
import { productInputSchema } from "@/lib/validation/catalog";
import type { ProductInput } from "@/types/catalog";

const importProductSchema = productInputSchema.omit({ image: true }).extend({
  image: z.string().trim().min(1).refine(isAllowedCatalogImage, "La imagen no pertenece a un host permitido").optional(),
});

const catalogImportRecordBaseSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "El id debe usar minúsculas, números y guiones"),
  imageFile: z.string().min(1, "El archivo de imagen es obligatorio").refine((value) => {
    if (value.startsWith("/") || value.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(value)) return false;
    const segments = value.split(/[\\/]/);
    return segments.every((segment) => segment && segment !== "." && segment !== "..");
  }, "El archivo de imagen debe ser una ruta relativa segura"),
  product: importProductSchema,
});

export type CatalogImportRecord = {
  id: string;
  imageFile: string;
  product: Omit<ProductInput, "image"> & { image?: string };
};

export const catalogImportRecordSchema = catalogImportRecordBaseSchema;

export function parseCatalogImport(input: unknown): CatalogImportRecord[] {
  const records = z.array(catalogImportRecordSchema).parse(input);
  const ids = new Set<string>();
  const names = new Set<string>();

  for (const record of records) {
    const normalizedName = record.product.name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    if (ids.has(record.id)) throw new Error(`Id de producto duplicado: ${record.id}`);
    if (names.has(normalizedName)) throw new Error(`Nombre de producto duplicado: ${record.product.name}`);
    ids.add(record.id);
    names.add(normalizedName);
  }

  return records;
}

export function getCatalogImportPath(): string {
  return "scripts/catalog/products.json";
}
