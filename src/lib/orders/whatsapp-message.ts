import type { Order } from "@/types/orders";

function normalizePhone(phone: string): string {
  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 7 || normalized.length > 15) {
    throw new Error("El telefono de WhatsApp no es valido");
  }
  return normalized;
}

export function buildWhatsAppMessage(order: Pick<Order, "id" | "customerName" | "items" | "total" | "address">, phone: string): string {
  const message = [
    `Pedido #${order.id}`,
    `Cliente: ${order.customerName}`,
    ...order.items.map((item) => `${item.quantity}x ${item.name} - $${item.subtotal.toLocaleString("es-CO")}`),
    `Total: $${order.total.toLocaleString("es-CO")}`,
    `Entrega: ${order.address}`,
  ].join("\n");

  return `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(message)}`;
}
