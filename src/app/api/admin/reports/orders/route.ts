import { z } from "zod";

import { requirePermission } from "@/lib/auth/permissions";
import { toAuthorizationResponse } from "@/lib/auth/verify-request";
import { generateOrderReport, orderReportFilterSchema } from "@/lib/reports/order-report";

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePermission(request as never, "reportes.read");
    const params = new URL(request.url).searchParams;
    const filter = orderReportFilterSchema.parse({ from: params.get("from") ?? undefined, to: params.get("to") ?? undefined, status: params.get("status") ?? undefined });
    return Response.json({ report: await generateOrderReport(filter) });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Los filtros no son válidos" }, { status: 422 });
    return toAuthorizationResponse(error);
  }
}
