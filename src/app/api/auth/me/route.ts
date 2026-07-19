import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({
    user: { id: session.sub, email: session.email, role: session.role, name: session.name, employeeId: session.employeeId },
  });
}
