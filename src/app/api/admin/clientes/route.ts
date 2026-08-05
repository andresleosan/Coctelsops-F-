import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { listUsers } from "@/lib/firestore/users";

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "clientes.read");
    const users = await listUsers();
    return Response.json({ customers: users.filter((user) => user.accountType === "customer") });
  } catch (error) {
    return toAuthorizationResponse(error);
  }
}
