import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { getStoreConfiguration, storeConfigurationSchema, updateStoreConfiguration } from "@/lib/firestore/configuration";

function errorResponse(error: unknown): Response {
  if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message ?? "Configuración inválida" }, { status: 422 });
  return toAuthorizationResponse(error);
}

export async function GET(request: Request): Promise<Response> {
  try { await requirePermission(request as never, "configuracion.read"); return Response.json({ configuration: await getStoreConfiguration() }); } catch (error) { return errorResponse(error); }
}

export async function PUT(request: Request): Promise<Response> {
  try { const actor = await requirePermission(request as never, "configuracion.write"); const configuration = await updateStoreConfiguration(storeConfigurationSchema.parse(await request.json()), actor.uid); return Response.json({ configuration }); } catch (error) { return errorResponse(error); }
}
