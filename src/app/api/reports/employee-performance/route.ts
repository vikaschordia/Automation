import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getEmployeePerformanceReport } from "@/lib/services/report-service";

export async function GET(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const params = request.nextUrl.searchParams;
    const rows = await getEmployeePerformanceReport({
      companyId: params.get("companyId") ?? undefined,
      departmentId: params.get("departmentId") ?? undefined,
    });
    return NextResponse.json({ rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
