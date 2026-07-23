import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { getDashboardData } from "@/lib/services/dashboard-service";

export async function GET() {
  try {
    const session = await requireSession(["EMPLOYEE"]);
    if (!session.employeeId) throw new ApiError(400, "No employee profile linked to this account");
    // Same shape as the admin dashboard (getDashboardData with no filter) — just scoped to only
    // this employee's own tasks, so "My Dashboard" shows exactly what the admin dashboard shows,
    // computed from a dataset of one.
    const data = await getDashboardData({ employeeId: session.employeeId });
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
