import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { deleteRole, getRole, updateRole } from "@/lib/firestore/roles";
import type { RoleInput } from "@/types/auth";

const roleInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300),
  active: z.boolean(),
  permissions: z.array(z.string().regex(/^[^.]+\.[^.]+$/)).max(100),
}).strict();

type Context = { params: Promise<{ id: string }> };

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: "Los datos del rol no son válidos" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    await requirePermission(request as never, "roles.read");
    const { id } = await context.params;
    const role = await getRole(id);
    return role ? Response.json({ role }) : Response.json({ error: "Rol no encontrado" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const actor = await requirePermission(request as never, "roles.write");
    const { id } = await context.params;
    const input = roleInputSchema.parse(await request.json()) as RoleInput;
    await updateRole(id, input, actor.uid);
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  try {
    const actor = await requirePermission(request as never, "roles.write");
    const { id } = await context.params;
    await deleteRole(id, actor.uid);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
