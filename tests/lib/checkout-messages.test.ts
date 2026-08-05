import { describe, expect, it } from "vitest";

import { getCheckoutErrorMessage } from "@/lib/checkout/messages";

describe("mensajes de checkout", () => {
  it("usa el mensaje configurado para indisponibilidad", () => {
    expect(getCheckoutErrorMessage(500, undefined, "No podemos tomar pedidos ahora.")).toBe("No podemos tomar pedidos ahora.");
    expect(getCheckoutErrorMessage(undefined, undefined, "No podemos tomar pedidos ahora.")).toBe("No podemos tomar pedidos ahora.");
  });

  it("conserva el detalle de validación del servidor", () => {
    expect(getCheckoutErrorMessage(422, "La promoción ya venció", "No disponible")).toBe("La promoción ya venció");
  });
});
