import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getAdminDashboardData } from "@/lib/services/dashboard-service";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const data = await getAdminDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
