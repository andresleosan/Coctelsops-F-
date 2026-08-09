import { beforeEach, describe, expect, it, vi } from "vitest";

const { listActiveProducts } = vi.hoisted(() => ({ listActiveProducts: vi.fn() }));

vi.mock("@/lib/firestore/products", () => ({ listActiveProducts }));

import { getFeaturedProducts } from "@/lib/catalog/home";

const product = (id: string, featured: boolean) => ({
  id,
  name: `Producto ${id}`,
  description: "Bebida de prueba",
  price: 8500,
  image: "/catalog-placeholder.svg",
  category: "granizado" as const,
  availableFlavors: ["Fresa"],
  availableAddOns: [],
  stock: 10,
  active: true,
  featured,
});

describe("getFeaturedProducts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("usa los productos destacados activos entregados por Firestore", async () => {
    listActiveProducts.mockResolvedValueOnce([product("firestore-1", true), product("firestore-2", false)]);

    await expect(getFeaturedProducts()).resolves.toEqual([product("firestore-1", true)]);
  });

  it("usa el catálogo estático solo cuando Firestore no está disponible", async () => {
    listActiveProducts.mockRejectedValueOnce(new Error("Falta la variable FIREBASE_PROJECT_ID"));

    await expect(getFeaturedProducts()).resolves.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "1" }),
      expect.objectContaining({ id: "2" }),
      expect.objectContaining({ id: "3" }),
    ]));
  });

  it("no oculta errores de Firestore que no sean de configuración", async () => {
    const error = new Error("Firestore no responde");
    listActiveProducts.mockRejectedValueOnce(error);

    await expect(getFeaturedProducts()).rejects.toBe(error);
  });
});
