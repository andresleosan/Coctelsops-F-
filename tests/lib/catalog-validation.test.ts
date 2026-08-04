import { describe, expect, it } from "vitest";

import { productInputSchema } from "@/lib/validation/catalog";

const validProduct = {
  name: "Fresa Salvaje",
  description: "Granizado de fresa natural.",
  price: 8500,
  image: "https://example.com/fresa.png",
  category: "granizado",
  availableFlavors: ["Fresa", "Mora"],
  availableAddOns: [{ name: "Gomitas", price: 1500 }],
  stock: 10,
  active: true,
  featured: true,
};

describe("productInputSchema", () => {
  it("acepta una entrada de producto válida", () => {
    expect(productInputSchema.parse(validProduct)).toEqual(validProduct);
  });

  it.each([
    ["precio cero", { price: 0 }],
    ["precio negativo", { price: -1 }],
    ["nombre ausente", { name: "" }],
    ["categoría inválida", { category: "bebida" }],
    ["stock negativo", { stock: -1 }],
    ["imagen mal formada", { image: "not-a-url" }],
    ["imagen con host relativo", { image: "//example.com/image.png" }],
  ])("rechaza %s", (_case, override) => {
    expect(() => productInputSchema.parse({ ...validProduct, ...override })).toThrow();
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
