import { describe, expect, it } from "vitest";

import { calculatePromotion } from "@/lib/firestore/promotions";
import type { Promotion, PromotionContext } from "@/types/operations";

const promotion: Promotion = {
  id: "promo-1",
  code: "FIESTA",
  active: true,
  startsAt: "2026-01-01T00:00:00.000Z",
  endsAt: "2026-12-31T23:59:59.999Z",
  discountType: "percent",
  discountValue: 20,
  minimumSubtotal: 20_000,
  productIds: ["fresa"],
  usageLimit: 10,
  usageCount: 2,
  maxDiscount: 8_000,
};

const context: PromotionContext = {
  promotion,
  subtotal: 30_000,
  now: "2026-08-04T12:00:00.000Z",
  items: [{ productId: "fresa", category: "granizado", subtotal: 30_000 }],
};

describe("calculadora de promociones", () => {
  it("calcula un total determinista y respeta el tope", () => {
    expect(calculatePromotion(context)).toEqual({ applied: true, discount: 6_000, total: 24_000, code: "FIESTA" });
    expect(calculatePromotion(context)).toEqual(calculatePromotion(context));
  });

  it("rechaza promociones vencidas o inactivas", () => {
    expect(calculatePromotion({ ...context, now: "2027-01-01T00:00:00.000Z" })).toMatchObject({ applied: false, reason: "vencida" });
    expect(calculatePromotion({ ...context, promotion: { ...promotion, active: false } })).toMatchObject({ applied: false, reason: "inactiva" });
  });

  it("valida mínimo, alcance y límite de uso", () => {
    expect(calculatePromotion({ ...context, subtotal: 10_000 })).toMatchObject({ applied: false, reason: "mínimo" });
    expect(calculatePromotion({ ...context, items: [{ productId: "mango", category: "granizado", subtotal: 30_000 }] })).toMatchObject({ applied: false, reason: "alcance" });
    expect(calculatePromotion({ ...context, promotion: { ...promotion, usageCount: 10 } })).toMatchObject({ applied: false, reason: "límite" });
  });

  it("aplica descuentos fijos sin superar el subtotal elegible", () => {
    const fixed: Promotion = { ...promotion, discountType: "fixed", discountValue: 50_000, productIds: undefined, maxDiscount: undefined };
    expect(calculatePromotion({ ...context, promotion: fixed, subtotal: 30_000, items: [{ productId: "mango", category: "granizado", subtotal: 30_000 }] })).toMatchObject({ applied: true, discount: 30_000, total: 0 });
  });
});
