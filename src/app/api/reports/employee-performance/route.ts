import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getEmployeePerformanceReport } from "@/lib/services/report-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;
    // Employees viewing Reports only ever see their own row — company/department filters are an
    // admin-only concept (comparing across employees), so they're ignored for anyone else.
    const rows = await getEmployeePerformanceReport(
      session.role === "ADMIN"
        ? {
            companyId: params.get("companyId") ?? undefined,
            departmentId: params.get("departmentId") ?? undefined,
            sortBy: params.get("sortBy") ?? undefined,
            sortDir: params.get("sortDir") === "desc" ? "desc" : "asc",
          }
        : {
            employeeId: session.employeeId ?? "__none__",
            sortBy: params.get("sortBy") ?? undefined,
            sortDir: params.get("sortDir") === "desc" ? "desc" : "asc",
          },
    );
    return NextResponse.json({ rows });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
