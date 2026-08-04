import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { auditUserMutation, getUserProfile, updateUser } from "@/lib/firestore/users";

const updateSchema = z.object({
  active: z.boolean().optional(),
  roleIds: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
}).strict().refine((data) => data.active !== undefined || data.roleIds !== undefined, "No hay cambios para aplicar");

type Context = { params: Promise<{ uid: string }> };

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: "Los datos del usuario no son válidos" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request, context: Context): Promise<Response> {
  try {
    await requirePermission(request as never, "usuarios.read");
    const { uid } = await context.params;
    const user = await getUserProfile(uid);
    return user ? Response.json({ user }) : Response.json({ error: "Usuario no encontrado" }, { status: 404 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  try {
    const actor = await requirePermission(request as never, "usuarios.manage");
    const { uid } = await context.params;
    const input = updateSchema.parse(await request.json());
    await updateUser(uid, input);
    await auditUserMutation(actor.uid, uid, input);
    const user = await getUserProfile(uid);
    return Response.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
