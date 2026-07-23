import { NextResponse } from "next/server";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { getDashboardData } from "@/lib/services/dashboard-service";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
