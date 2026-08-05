import type { OrderStatus } from "@/types/orders";

export type OrderAction = {
  nextStatus: OrderStatus;
  label: string;
};

const actions: Partial<Record<OrderStatus, OrderAction>> = {
  pendiente: { nextStatus: "confirmado", label: "CONFIRMAR" },
  confirmado: { nextStatus: "preparando", label: "PREPARAR" },
  preparando: { nextStatus: "en_camino", label: "ENVIAR" },
  en_camino: { nextStatus: "entregado", label: "ENTREGADO" },
};

export function getOrderAction(status: OrderStatus): OrderAction | null {
  return actions[status] ?? null;
}
