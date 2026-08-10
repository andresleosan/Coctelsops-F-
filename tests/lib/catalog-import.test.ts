import { beforeEach, describe, expect, it, vi } from "vitest";

const { readFile, validateLocalProductImage, uploadLocalProductImage, deleteLocalProductImage, upsertImportedProduct } = vi.hoisted(() => ({
  readFile: vi.fn(),
  validateLocalProductImage: vi.fn(),
  uploadLocalProductImage: vi.fn(),
  deleteLocalProductImage: vi.fn(),
  upsertImportedProduct: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ default: { readFile }, readFile }));
vi.mock("@/lib/catalog/storage", () => ({ validateLocalProductImage, uploadLocalProductImage, deleteProductImage: deleteLocalProductImage }));
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
    uploadLocalProductImage.mockResolvedValue({
      key: "catalog/products/fresa-salvaje/uuid-fresa.jpg",
      url: "https://images.example.com/catalog/products/fresa-salvaje/uuid-fresa.jpg",
    });
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
    expect(upsertImportedProduct).toHaveBeenCalledWith("fresa-salvaje", { ...validProduct, image: "https://images.example.com/catalog/products/fresa-salvaje/uuid-fresa.jpg" }, "catalog-import");
  });

  it("borra la imagen nueva si falla el upsert y conserva el error original", async () => {
    upsertImportedProduct.mockRejectedValueOnce(new Error("Firestore indisponible"));

    await expect(runCatalogImport({ dryRun: false })).resolves.toMatchObject({
      products: 1,
      images: 1,
      errors: ["fresa-salvaje: Firestore indisponible"],
    });
    expect(deleteLocalProductImage).toHaveBeenCalledWith("catalog/products/fresa-salvaje/uuid-fresa.jpg");
  });

  it("no intenta borrar si falla la subida", async () => {
    uploadLocalProductImage.mockRejectedValueOnce(new Error("R2 indisponible"));

    await expect(runCatalogImport({ dryRun: false })).resolves.toMatchObject({
      products: 1,
      images: 0,
      errors: ["fresa-salvaje: R2 indisponible"],
    });
    expect(deleteLocalProductImage).not.toHaveBeenCalled();
  });

  it("informa si la limpieza compensatoria también falla", async () => {
    upsertImportedProduct.mockRejectedValueOnce(new Error("Firestore indisponible"));
    const cleanupError = "R2 no permite borrar: https://secret.example/token";
    deleteLocalProductImage.mockRejectedValueOnce(new Error(cleanupError));

    const report = await runCatalogImport({ dryRun: false });

    expect(report.errors).toEqual(["fresa-salvaje: Firestore indisponible; la limpieza de la imagen no pudo completarse para el producto fresa-salvaje"]);
    expect(report.errors.join(" ")).toContain("fresa-salvaje");
    expect(report.errors.join(" ")).not.toContain(cleanupError);
  });
});
