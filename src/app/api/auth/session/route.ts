import { verifyRequest, toAuthorizationResponse } from "@/lib/auth/verify-request";
import { resolvePermissions } from "@/lib/auth/permissions";

export async function GET(request: Request): Promise<Response> {
  try {
    const verified = await verifyRequest(request as never);
    const permissions = await resolvePermissions(verified.profile);
    return Response.json({ user: { ...verified.profile, permissions } });
  } catch (error) {
    return toAuthorizationResponse(error);
  }
}
