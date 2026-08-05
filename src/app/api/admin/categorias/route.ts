import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { createCategory, listAllCategories } from "@/lib/firestore/categories";
import { categoryInputSchema } from "@/lib/validation/catalog";

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Categoría inválida" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const caller = await requirePermission(request as never, "categorias.read");
    return Response.json({ categories: await listAllCategories(caller) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const caller = await requirePermission(request as never, "categorias.write");
    const id = await createCategory(categoryInputSchema.parse(await request.json()), caller);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
