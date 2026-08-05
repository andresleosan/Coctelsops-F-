import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { deleteCategory, updateCategory } from "@/lib/firestore/categories";
import { categoryInputSchema } from "@/lib/validation/catalog";

type Context = { params: Promise<{ id: string }> };
function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Categoría inválida" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const caller = await requirePermission(request as never, "categorias.write");
    await updateCategory((await context.params).id, categoryInputSchema.parse(await request.json()), caller);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    const caller = await requirePermission(request as never, "categorias.write");
    await deleteCategory((await context.params).id, caller);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
