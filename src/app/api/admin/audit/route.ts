import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { listAuditEntries } from "@/lib/firestore/audit";

export async function GET(request: Request): Promise<Response> {
  try { await requirePermission(request as never, "auditoria.read"); return Response.json({ entries: await listAuditEntries() }); } catch (error) { return toAuthorizationResponse(error); }
}
