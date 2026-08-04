import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, where, collection, doc, set, update } = vi.hoisted(() => ({
  get: vi.fn(),
  where: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
}));

const productCollection = { where, get, doc };
const categoryCollection = { where, get };
const productRef = { id: "1", get, set, update };

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: () => ({ collection }),
}));

import {
  createProduct,
  getProductById,
  listActiveProducts,
  updateProduct,
} from "@/lib/firestore/products";

const productInput = {
  name: "Fresa Salvaje",
  description: "Granizado de fresa natural.",
  price: 8500,
  image: "https://example.com/fresa.png",
  category: "granizado" as const,
  availableFlavors: ["Fresa"],
  availableAddOns: [{ name: "Gomitas", price: 1500 }],
  stock: 10,
  active: true,
  featured: false,
};

describe("products repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collection.mockImplementation((name: string) => name === "categorias" ? categoryCollection : productCollection);
    doc.mockReturnValue(productRef);
    where.mockReturnValue(productCollection);
    set.mockResolvedValue(undefined);
    update.mockResolvedValue(undefined);
  });

  it("lista solo productos activos y los mapea con su id documental", async () => {
    get.mockResolvedValueOnce({
      docs: [
        {
          id: "1",
          data: () => ({ ...productInput, active: true }),
        },
      ],
    });

    await expect(listActiveProducts()).resolves.toEqual([{ id: "1", ...productInput }]);
    expect(collection).toHaveBeenCalledWith("productos");
    expect(where).toHaveBeenCalledWith("active", "==", true);
  });

  it("no devuelve productos inactivos en la lectura pública por id", async () => {
    get.mockResolvedValueOnce({ exists: true, data: () => ({ ...productInput, active: false }) });

    await expect(getProductById("1")).resolves.toBeNull();
    expect(doc).toHaveBeenCalledWith("1");
  });

  it("permite a una lectura administrativa incluir un producto inactivo", async () => {
    get.mockResolvedValueOnce({ exists: true, data: () => ({ ...productInput, active: false }) });

    await expect(getProductById("1", { includeInactive: true })).resolves.toMatchObject({ id: "1", active: false });
  });

  it("valida y escribe productos con el mismo id estable", async () => {
    await expect(createProduct(productInput, "1")).resolves.toBe("1");
    expect(doc).toHaveBeenCalledWith("1");
    expect(set).toHaveBeenCalledWith(expect.objectContaining(productInput));

    await updateProduct("1", { ...productInput, price: 9000 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ price: 9000 }));
  });

  it("lista solo categorías activas", async () => {
    get.mockResolvedValueOnce({
      docs: [{ id: "granizados", data: () => ({ name: "Granizados", active: true, order: 1 }) }],
    });

    const { listCategories } = await import("@/lib/firestore/categories");
    await expect(listCategories()).resolves.toEqual([
      { id: "granizados", name: "Granizados", active: true, order: 1 },
    ]);
    expect(collection).toHaveBeenCalledWith("categorias");
    expect(where).toHaveBeenCalledWith("active", "==", true);
  });
});
