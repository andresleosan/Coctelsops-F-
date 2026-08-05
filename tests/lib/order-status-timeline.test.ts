import { describe, expect, it } from "vitest";

import { getOrderTimeline, isTimelineConnectorComplete } from "@/lib/orders/status-timeline";
import type { CustomerOrder } from "@/types/orders";

const cancelledOrder: CustomerOrder = {
  id: "pedido-cancelado",
  customerName: "Cliente",
  phone: "324 555 0000",
  address: "Carrera 1 # 2-3",
  items: [],
  subtotal: 0,
  total: 0,
  status: "cancelado",
  createdAt: "2026-08-04T10:00:00.000Z",
  updatedAt: "2026-08-04T10:20:00.000Z",
  statusHistory: [
    { status: "pendiente", at: "2026-08-04T10:00:00.000Z" },
    { status: "confirmado", at: "2026-08-04T10:10:00.000Z" },
    { status: "cancelado", at: "2026-08-04T10:20:00.000Z", reason: "Sin cobertura" },
  ],
};

describe("getOrderTimeline", () => {
  it("marks recorded progression complete and includes a timestamped cancellation", () => {
    const timeline = getOrderTimeline(cancelledOrder);

    expect(timeline).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: "pendiente", complete: true, at: "2026-08-04T10:00:00.000Z" }),
      expect.objectContaining({ status: "confirmado", complete: true, at: "2026-08-04T10:10:00.000Z" }),
      expect.objectContaining({ status: "preparando", complete: false }),
      expect.objectContaining({ status: "cancelado", complete: false, at: "2026-08-04T10:20:00.000Z", reason: "Sin cobertura" }),
    ]));
    expect(timeline).toHaveLength(6);
  });

  it("uses updatedAt for a legacy cancelled order without status history", () => {
    const timeline = getOrderTimeline({ ...cancelledOrder, statusHistory: [] });

    expect(timeline.at(-1)).toEqual(expect.objectContaining({ status: "cancelado", at: "2026-08-04T10:20:00.000Z" }));
    expect(timeline.filter((event) => event.complete)).toHaveLength(0);
  });

  it("does not complete the connector after the last completed non-terminal state", () => {
    const timeline = getOrderTimeline({
      ...cancelledOrder,
      status: "confirmado",
      statusHistory: [
        { status: "pendiente", at: "2026-08-04T10:00:00.000Z" },
        { status: "confirmado", at: "2026-08-04T10:10:00.000Z" },
      ],
    });
    const confirmedIndex = timeline.findIndex((event) => event.status === "confirmado");

    expect(isTimelineConnectorComplete(timeline[confirmedIndex], timeline[confirmedIndex + 1])).toBe(false);
    expect(isTimelineConnectorComplete(timeline[confirmedIndex - 1], timeline[confirmedIndex])).toBe(true);
  });
});
