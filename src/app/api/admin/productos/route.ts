import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { createProduct, listAllProducts } from "@/lib/firestore/products";
import { productInputSchema } from "@/lib/validation/catalog";

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Producto inválido" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const caller = await requirePermission(request as never, "productos.read");
    return Response.json({ products: await listAllProducts(caller) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const caller = await requirePermission(request as never, "productos.write");
    const id = await createProduct(productInputSchema.parse(await request.json()), caller);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
