import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { auditRoleMutation, createRole, listRoles } from "@/lib/firestore/roles";
import type { RoleInput } from "@/types/auth";

const roleInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(300).default(""),
  active: z.boolean().default(true),
  permissions: z.array(z.string().regex(/^[^.]+\.[^.]+$/)).max(100),
}).strict();

function jsonError(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: "Los datos del rol no son válidos" }, { status: 422 });
  if (error instanceof Error && error.message === "El rol ya existe") return Response.json({ error: error.message }, { status: 409 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "roles.read");
    return Response.json({ roles: await listRoles() });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const actor = await requirePermission(request as never, "roles.write");
    const input = roleInputSchema.parse(await request.json()) as RoleInput;
    const id = await createRole(input);
    await auditRoleMutation(actor.uid, id, "create", input);
    return Response.json({ id }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
