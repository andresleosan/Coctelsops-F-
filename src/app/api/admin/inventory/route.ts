import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { InventoryValidationError, listInventoryMovements, recordInventoryMovement } from "@/lib/firestore/inventory";

const movementSchema = z.object({ productId: z.string().trim().min(1), type: z.enum(["entrada", "salida", "ajuste"]), quantity: z.number().int().refine((value) => value !== 0), reason: z.string().trim().min(3).max(240) });

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Movimiento inválido" }, { status: 422 });
  if (error instanceof InventoryValidationError) return Response.json({ error: error.message }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "inventario.read");
    return Response.json({ movements: await listInventoryMovements() });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requirePermission(request as never, "inventario.write");
    const input = movementSchema.parse(await request.json());
    await recordInventoryMovement({ ...input, actorUid: actor.uid });
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}
