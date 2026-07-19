import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { employeeSchema } from "@/lib/validations/employee";
import { hashPassword } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const params = request.nextUrl.searchParams;
    const companyId = params.get("companyId") ?? undefined;
    const departmentId = params.get("departmentId") ?? undefined;
    const status = params.get("status") ?? undefined;
    const search = params.get("search")?.trim();

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        departmentId,
        status: status ?? undefined,
        OR: search
          ? [
              { name: { contains: search } },
              { employeeCode: { contains: search } },
              { email: { contains: search } },
              { designation: { contains: search } },
            ]
          : undefined,
      },
      orderBy: { name: "asc" },
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        user: { select: { id: true, isActive: true, lastLoginAt: true } },
        _count: { select: { assignedTasks: true } },
      },
    });
    return NextResponse.json({ employees });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = employeeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const data = parsed.data;

    const [codeOwner, emailOwner] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeCode: data.employeeCode } }),
      prisma.employee.findUnique({ where: { email: data.email } }),
    ]);
    if (codeOwner) return NextResponse.json({ error: `Employee code "${data.employeeCode}" is already in use` }, { status: 409 });
    if (emailOwner) return NextResponse.json({ error: `Email "${data.email}" is already in use` }, { status: 409 });

    const employee = await prisma.$transaction(async (tx) => {
      const created = await tx.employee.create({
        data: {
          employeeCode: data.employeeCode,
          name: data.name,
          designation: data.designation,
          email: data.email,
          phone: data.phone || null,
          status: data.status,
          joiningDate: data.joiningDate,
          departmentId: data.departmentId,
          companyId: data.companyId,
          managerId: data.managerId || null,
        },
      });

      if (data.createLogin) {
        const passwordHash = await hashPassword(data.password && data.password.length >= 6 ? data.password : "Passw0rd!");
        await tx.user.create({
          data: {
            email: data.email,
            passwordHash,
            role: "EMPLOYEE",
            isActive: data.status === "ACTIVE",
            employeeId: created.id,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ employee }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
