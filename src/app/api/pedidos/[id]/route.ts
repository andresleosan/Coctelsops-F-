import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse, verifyRequest } from "@/lib/auth/verify-request";
import { getCustomerOrder, OrderNotFoundError, updateOrderStatus } from "@/lib/firestore/orders";
import { OrderValidationError, statusUpdateSchema } from "@/lib/validation/orders";

type RouteContext = { params: Promise<{ id: string }> };

function toOrderResponse(error: unknown): Response {
  if (error instanceof SyntaxError || error instanceof z.ZodError || error instanceof OrderValidationError || (error instanceof Error && error.name === "ZodError")) {
    const message = error instanceof SyntaxError ? "El cuerpo de la solicitud no es un JSON valido" : error instanceof z.ZodError ? error.issues[0]?.message : (error as Error).message;
    return Response.json({ error: message ?? "Los datos del pedido no son validos" }, { status: 422 });
  }
  if (error instanceof OrderNotFoundError) return Response.json({ error: error.message }, { status: 404 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await verifyRequest(request as never);
    const { id } = await context.params;
    return Response.json({ order: await getCustomerOrder(user, id) });
  } catch (error) {
    return toOrderResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  try {
    const user = await requirePermission(request as never, "pedidos.update");
    const { id } = await context.params;
    const input = statusUpdateSchema.parse(await request.json());
    return Response.json({ order: await updateOrderStatus(user, id, input) });
  } catch (error) {
    return toOrderResponse(error);
  }
}
