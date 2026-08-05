import { describe, expect, it } from "vitest";

import { calculateInventoryStock } from "@/lib/firestore/inventory";

describe("inventario", () => {
  it("suma entradas y resta salidas", () => {
    expect(calculateInventoryStock(10, { type: "entrada", quantity: 5 })).toBe(15);
    expect(calculateInventoryStock(10, { type: "salida", quantity: 4 })).toBe(6);
  });

  it("permite ajustes con delta firmado", () => {
    expect(calculateInventoryStock(10, { type: "ajuste", quantity: -3 })).toBe(7);
  });

  it("rechaza resultados negativos e inputs no positivos", () => {
    expect(() => calculateInventoryStock(2, { type: "salida", quantity: 3 })).toThrow("stock insuficiente");
    expect(() => calculateInventoryStock(2, { type: "entrada", quantity: 0 })).toThrow("cantidad");
    expect(() => calculateInventoryStock(-1, { type: "entrada", quantity: 1 })).toThrow("stock");
  });
});
