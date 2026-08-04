import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { listUsers } from "@/lib/firestore/users";

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "usuarios.read");
    return Response.json({ users: await listUsers() });
  } catch (error) {
    return toAuthorizationResponse(error);
  }
}
