import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFile, validateLocalProductImage, uploadLocalProductImage, upsertImportedProduct } = vi.hoisted(() => ({
  readFile: vi.fn(),
  validateLocalProductImage: vi.fn(),
  uploadLocalProductImage: vi.fn(),
  upsertImportedProduct: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ default: { readFile }, readFile }));
vi.mock("@/lib/catalog/storage", () => ({ validateLocalProductImage, uploadLocalProductImage }));
vi.mock("@/lib/firestore/products", () => ({ upsertImportedProduct }));

import { getCatalogImportPath, parseCatalogImport } from "@/lib/catalog/import-schema";
import { runCatalogImport } from "@/lib/catalog/importer";

const validProduct = {
  name: "Fresa Salvaje",
  description: "Granizado de fresa natural.",
  price: 8500,
  category: "granizado" as const,
  availableFlavors: ["Fresa"],
  availableAddOns: [{ name: "Gomitas", price: 1500 }],
  stock: 10,
  active: true,
  featured: true,
};

describe("contrato de importación de catálogo", () => {
  it("acepta un registro con imagen comercial omitida", () => {
    expect(parseCatalogImport([{ id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct }])).toEqual([
      { id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct },
    ]);
  });

  it.each([
    ["id inválido", { id: "Fresa Salvaje" }],
    ["traversal POSIX", { imageFile: "../fresa.jpg" }],
    ["traversal Windows", { imageFile: "..\\fresa.jpg" }],
    ["precio inválido", { product: { ...validProduct, price: 0 } }],
  ])("rechaza %s", (_case, override) => {
    expect(() => parseCatalogImport([{ id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct, ...override }])).toThrow();
  });

  it("rechaza ids y nombres comerciales duplicados", () => {
    expect(() => parseCatalogImport([
      { id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct },
      { id: "fresa-salvaje-2", imageFile: "fresa-2.jpg", product: { ...validProduct, name: " fReSa  Salvaje " } },
    ])).toThrow();
  });

  it("devuelve la ruta fija que solo provee el operador", () => {
    expect(getCatalogImportPath()).toBe("scripts/catalog/products.json");
  });
});

describe("runCatalogImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFile.mockResolvedValue(JSON.stringify([{ id: "fresa-salvaje", imageFile: "fresa.jpg", product: validProduct }]));
    validateLocalProductImage.mockResolvedValue(undefined);
    uploadLocalProductImage.mockResolvedValue("https://firebasestorage.googleapis.com/v0/b/example/o/catalog%2Fproducts%2Ffresa-salvaje%2Ffresa.jpg");
    upsertImportedProduct.mockResolvedValue("created");
  });

  it("hace dry-run sin llamar a Storage ni escribir Firestore", async () => {
    await expect(runCatalogImport({ dryRun: true })).resolves.toEqual({
      products: 1,
      images: 0,
      created: 0,
      updated: 0,
      errors: [],
    });
    expect(validateLocalProductImage).toHaveBeenCalledWith("fresa.jpg");
    expect(uploadLocalProductImage).not.toHaveBeenCalled();
    expect(upsertImportedProduct).not.toHaveBeenCalled();
  });

  it("sube y hace upsert con actor técnico cuando se habilita la escritura", async () => {
    await expect(runCatalogImport({ dryRun: false })).resolves.toMatchObject({ products: 1, images: 1, created: 1 });
    expect(uploadLocalProductImage).toHaveBeenCalledWith("fresa.jpg", "fresa-salvaje");
    expect(upsertImportedProduct).toHaveBeenCalledWith("fresa-salvaje", { ...validProduct, image: expect.any(String) }, "catalog-import");
  });
});
