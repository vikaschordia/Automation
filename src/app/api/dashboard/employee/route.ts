import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { getEmployeeDashboardData } from "@/lib/services/dashboard-service";

export async function GET() {
  try {
    const session = await requireSession(["EMPLOYEE"]);
    if (!session.employeeId) throw new ApiError(400, "No employee profile linked to this account");
    const data = await getEmployeeDashboardData(session.employeeId);
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
