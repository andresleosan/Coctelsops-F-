import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { requireVerifiedEmail, toAuthorizationResponse } from "@/lib/auth/verify-request";
import { createOrder, listOrders } from "@/lib/firestore/orders";
import { OrderValidationError, createOrderInputSchema } from "@/lib/validation/orders";

function toOrderResponse(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof z.ZodError || error instanceof OrderValidationError || (error instanceof Error && error.name === "ZodError")) {
    const message = error instanceof SyntaxError ? "El cuerpo de la solicitud no es un JSON valido" : error instanceof z.ZodError ? error.issues[0]?.message : (error as Error).message;
    return Response.json({ error: message ?? "Los datos del pedido no son validos" }, { status: 422 });
  }
  return toAuthorizationResponse(error);
}

export async function POST(request: Request): Promise<Response> {
  try {
    const user = await requireVerifiedEmail(request as never);
    const input = createOrderInputSchema.parse(await request.json());
    const order = await createOrder(user, input);
    return Response.json({ order }, { status: 201 });
  } catch (error) {
    return toOrderResponse(error);
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    const user = await requirePermission(request as never, "pedidos.read");
    return Response.json({ orders: await listOrders(user) });
  } catch (error) {
    return toOrderResponse(error);
  }
}
