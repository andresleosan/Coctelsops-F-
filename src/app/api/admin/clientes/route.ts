import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { listUsers } from "@/lib/firestore/users";
import type { CustomerProfile } from "@/types/auth";

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "clientes.read");
    const users = await listUsers();
    const customers: CustomerProfile[] = users
      .filter((user) => user.accountType === "customer")
      .map(({ uid, email, displayName, photoURL, telefono, addresses }) => ({ uid, email, displayName, photoURL, telefono, addresses }));
    return Response.json({ customers });
  } catch (error) {
    return toAuthorizationResponse(error);
  }
}
