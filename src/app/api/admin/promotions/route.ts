import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { createPromotion, deletePromotion, listPromotions, promotionInputSchema, updatePromotion } from "@/lib/firestore/promotions";

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Promoción inválida" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try { await requirePermission(request as never, "promociones.read"); return Response.json({ promotions: await listPromotions() }); } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request): Promise<Response> {
  try { const actor = await requirePermission(request as never, "promociones.write"); const id = await createPromotion(promotionInputSchema.parse(await request.json()), actor.uid); return Response.json({ id }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

export async function PATCH(request: Request): Promise<Response> {
  try { const actor = await requirePermission(request as never, "promociones.write"); const id = new URL(request.url).searchParams.get("id"); if (!id) return Response.json({ error: "Falta el identificador" }, { status: 422 }); await updatePromotion(id, promotionInputSchema.parse(await request.json()), actor.uid); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  try { const actor = await requirePermission(request as never, "promociones.write"); const id = new URL(request.url).searchParams.get("id"); if (!id) return Response.json({ error: "Falta el identificador" }, { status: 422 }); await deletePromotion(id, actor.uid); return Response.json({ ok: true }); } catch (error) { return errorResponse(error); }
}
