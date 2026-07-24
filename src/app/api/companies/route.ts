import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { companySchema } from "@/lib/validations/company";
import { logAudit } from "@/lib/services/audit-service";

export async function GET() {
  try {
    const session = await requireSession();

    if (session.role !== "ADMIN") {
      // Employees only see companies they're actually mapped to (primary + additional) — e.g. so
      // the "add my own task" form's Company dropdown can't leak the whole org's company list.
      const employee = session.employeeId
        ? await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { companyId: true, additionalCompanyIds: true } })
        : null;
      if (!employee) return NextResponse.json({ companies: [] });

      const allowedIds = Array.from(new Set([employee.companyId, ...employee.additionalCompanyIds]));
      const companies = await prisma.company.findMany({
        where: { id: { in: allowedIds } },
        orderBy: { name: "asc" },
        include: { _count: { select: { departments: true, employees: true, tasks: true } } },
      });
      return NextResponse.json({ companies });
    }

    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { departments: true, employees: true, tasks: true } } },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.company.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return NextResponse.json({ error: `Company code "${parsed.data.code}" is already in use` }, { status: 409 });
    }

    const company = await prisma.company.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address || null,
        isActive: parsed.data.isActive ?? true,
      },
    });
    await logAudit({ session, action: "CREATE", entityType: "COMPANY", entityId: company.id, summary: `Created company "${company.name}"` });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
