import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { departmentSchema } from "@/lib/validations/department";
import { logAudit } from "@/lib/services/audit-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;

    if (session.role !== "ADMIN") {
      // Employees may only list departments for a company they're actually mapped to — never
      // the whole org's department list, and never without a companyId to scope it by.
      if (!companyId) return NextResponse.json({ departments: [] });
      const employee = session.employeeId
        ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { companyId: true, additionalCompanyIds: true } })
        : null;
      const allowed = !!employee && (employee.companyId === companyId || employee.additionalCompanyIds.includes(companyId));
      if (!allowed) return NextResponse.json({ departments: [] });
    }

    const departments = await prisma.department.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
      include: { company: { select: { id: true, name: true } }, _count: { select: { employees: true, tasks: true } } },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = departmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const duplicate = await prisma.department.findUnique({
      where: { name_companyId: { name: parsed.data.name, companyId: parsed.data.companyId } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "This department already exists for the selected company" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: {
        name: parsed.data.name,
        companyId: parsed.data.companyId,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await logAudit({ session, action: "CREATE", entityType: "DEPARTMENT", entityId: department.id, summary: `Created department "${department.name}"` });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
