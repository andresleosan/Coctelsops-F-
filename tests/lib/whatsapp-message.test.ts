import { describe, expect, it } from "vitest";

import { buildWhatsAppMessage } from "@/lib/orders/whatsapp-message";
import type { Order } from "@/types/orders";

const order: Order = {
  id: "pedido-123",
  clienteUid: "customer-1",
  customerName: "Ana Perez",
  phone: "324 555 0000",
  address: "Carrera 37 # 66-36",
  notes: "Timbre azul",
  items: [{
    productId: "fresa",
    name: "Fresa Salvaje",
    quantity: 1,
    unitPrice: 11500,
    subtotal: 11500,
    customization: { size: "Medium", flavors: ["Fresa"], addOns: ["Gomitas"] },
  }],
  subtotal: 11500,
  total: 11500,
  status: "pendiente",
  createdAt: "2026-08-04T12:00:00.000Z",
  updatedAt: "2026-08-04T12:00:00.000Z",
  audit: { createdByUid: "customer-1", createdAt: "2026-08-04T12:00:00.000Z" },
};

describe("WhatsApp order link", () => {
  it("returns an encoded prepared link without sending anything", () => {
    const url = buildWhatsAppMessage(order, "+57 324 554 5530");

    expect(url.startsWith("https://wa.me/573245545530?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toContain("Pedido #pedido-123");
    expect(decodeURIComponent(url.split("?text=")[1])).toContain("Fresa Salvaje");
    expect(url).not.toContain("[object Object]");
  });
});
