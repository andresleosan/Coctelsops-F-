import type { CustomerOrder, OrderStatus } from "@/types/orders";

const statusSteps: Array<{ status: Exclude<OrderStatus, "cancelado">; title: string; description: string }> = [
  { status: "pendiente", title: "Pedido recibido", description: "Tu solicitud llegó a la central." },
  { status: "confirmado", title: "Pedido confirmado", description: "La central confirmó tu pedido." },
  { status: "preparando", title: "En preparación", description: "Estamos preparando tus bebidas." },
  { status: "en_camino", title: "En camino", description: "Tu pedido va hacia la dirección indicada." },
  { status: "entregado", title: "Entregado", description: "Disfruta tu pedido." },
];

export type OrderTimelineEvent = {
  status: OrderStatus;
  title: string;
  description: string;
  complete: boolean;
  at?: string;
  reason?: string;
};

export function isTimelineConnectorComplete(current?: OrderTimelineEvent, next?: OrderTimelineEvent): boolean {
  return current?.complete === true && next?.complete === true;
}

export function getOrderTimeline(order: CustomerOrder): OrderTimelineEvent[] {
  const history = order.statusHistory ?? [];
  const historyByStatus = new Map(history.map((event) => [event.status, event]));
  const currentIndex = statusSteps.findIndex((step) => step.status === order.status);
  const recordedIndex = statusSteps.reduce((highest, step, index) => historyByStatus.has(step.status) ? Math.max(highest, index) : highest, -1);
  const progressionIndex = order.status === "cancelado" ? recordedIndex : Math.max(currentIndex, recordedIndex);

  const timeline = statusSteps.map((step, index): OrderTimelineEvent => {
    const event = historyByStatus.get(step.status);
    return {
      status: step.status,
      title: step.title,
      description: step.description,
      complete: progressionIndex >= index,
      ...(event?.at ? { at: event.at } : {}),
    };
  });

  const cancellation = history.findLast((event) => event.status === "cancelado");
  if (order.status === "cancelado" || cancellation) {
    timeline.push({
      status: "cancelado",
      title: "Pedido cancelado",
      description: "Este pedido ya no continúa.",
      complete: false,
      at: cancellation?.at || order.updatedAt || order.createdAt,
      ...(cancellation?.reason ? { reason: cancellation.reason } : {}),
    });
  }

  return timeline;
}
