import { afterEach, describe, expect, it, vi } from "vitest";

import { productInputSchema } from "@/lib/validation/catalog";

const validProduct = {
  name: "Fresa Salvaje",
  description: "Granizado de fresa natural.",
  price: 8500,
  image: "/catalog-placeholder.svg",
  category: "granizado",
  availableFlavors: ["Fresa", "Mora"],
  availableAddOns: [{ name: "Gomitas", price: 1500 }],
  stock: 10,
  active: true,
  featured: true,
};

describe("productInputSchema", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("acepta una entrada de producto válida", () => {
    expect(productInputSchema.parse(validProduct)).toEqual(validProduct);
  });

  it("acepta dos puntos en la ruta de una imagen permitida", () => {
    const product = { ...validProduct, image: "https://firebasestorage.googleapis.com/v0/b/example/o/catalog%2Fproducts%2Ffresa%2Ffoo:123.png?alt=media&token=token" };

    expect(productInputSchema.parse(product)).toEqual(product);
  });

  it("acepta URLs estables generadas por Firebase Storage", () => {
    expect(productInputSchema.parse({
      ...validProduct,
      image: "https://firebasestorage.googleapis.com/v0/b/example/o/catalog%2Fproducts%2Ffresa%2Ffresa.jpg?alt=media&token=token",
    })).toEqual(expect.objectContaining({ image: expect.stringContaining("firebasestorage.googleapis.com") }));
  });

  it("acepta una URL HTTPS del host R2 configurado", () => {
    vi.stubEnv("R2_PUBLIC_BASE_URL", "https://images.example.com");
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");

    expect(productInputSchema.parse({
      ...validProduct,
      image: "https://images.example.com/catalog/products/fresa/fresa.jpg",
    })).toEqual(expect.objectContaining({ image: expect.stringContaining("images.example.com") }));
  });

  it("rechaza URLs de fotos aleatorias", () => {
    expect(() => productInputSchema.parse({
      ...validProduct,
      image: "https://picsum.photos/seed/fresa/600/600",
    })).toThrow();
  });

  it("rechaza rutas locales de productos que no sean el fallback controlado", () => {
    expect(() => productInputSchema.parse({ ...validProduct, image: "/Fresa.png" })).toThrow();
    expect(productInputSchema.parse(validProduct).image).toBe("/catalog-placeholder.svg");
  });

  it.each([
    ["precio cero", { price: 0 }],
    ["precio negativo", { price: -1 }],
    ["nombre ausente", { name: "" }],
    ["categoría inválida", { category: "bebida" }],
    ["stock negativo", { stock: -1 }],
    ["imagen mal formada", { image: "not-a-url" }],
    ["imagen con host relativo", { image: "//example.com/image.png" }],
    ["host de imagen no configurado", { image: "https://example.com/image.png" }],
    ["host R2 no configurado", { image: "https://images.example.com/catalog/products/fresa/fresa.jpg" }],
    ["host permitido con puerto", { image: "https://firebasestorage.googleapis.com:8443/image.png" }],
  ])("rechaza %s", (_case, override) => {
    vi.stubEnv("R2_PUBLIC_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");
    expect(() => productInputSchema.parse({ ...validProduct, ...override })).toThrow();
  });

  it("rechaza una URL HTTP aunque el host R2 esté configurado", () => {
    vi.stubEnv("R2_PUBLIC_BASE_URL", "http://images.example.com");
    vi.stubEnv("NEXT_PUBLIC_R2_PUBLIC_BASE_URL", "");

    expect(() => productInputSchema.parse({
      ...validProduct,
      image: "http://images.example.com/catalog/products/fresa/fresa.jpg",
    })).toThrow();
  });

  it("rechaza nombres de adiciones duplicados sin distinguir mayúsculas", () => {
    expect(() =>
      productInputSchema.parse({
        ...validProduct,
        availableAddOns: [
          { name: "Gomitas", price: 1500 },
          { name: "gomitas", price: 2000 },
        ],
      }),
    ).toThrow();
  });
});
