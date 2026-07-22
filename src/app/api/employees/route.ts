import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { employeeSchema } from "@/lib/validations/employee";
import { hashPassword } from "@/lib/auth";

const EMPLOYEE_DEFAULT_PASSWORD = process.env.EMPLOYEE_DEFAULT_PASSWORD ?? "Employee@123";

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
        // A company filter matches an employee's primary company OR any company they're
        // additionally mapped to — e.g. filtering "Beta Traders" should surface someone whose
        // home company is Alpha Industries but who's also mapped to Beta Traders.
        ...(companyId ? { OR: [{ companyId }, { additionalCompanies: { some: { id: companyId } } }] } : {}),
        departmentId,
        status: status ?? undefined,
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { employeeCode: { contains: search } },
                { email: { contains: search } },
                { designation: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        additionalCompanies: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        manager: { select: { id: true, name: true } },
        user: { select: { id: true, isActive: true, lastLoginAt: true } },
        // Excludes soft-deleted tasks — otherwise this stays inflated forever, even after every
        // one of an employee's tasks has been deleted, since deletion just flags deletedAt rather
        // than removing the row.
        _count: { select: { assignedTasks: { where: { deletedAt: null } } } },
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

    // Never let the primary company also be sent as an "additional" one — a client bug/replay
    // shouldn't be able to produce a nonsensical self-referencing mapping.
    const additionalCompanyIds = (data.additionalCompanyIds ?? []).filter((cid) => cid !== data.companyId);

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
          canViewExpenses: data.canViewExpenses ?? false,
          additionalCompanies: additionalCompanyIds.length > 0 ? { connect: additionalCompanyIds.map((id) => ({ id })) } : undefined,
        },
      });

      if (data.createLogin) {
        const passwordHash = await hashPassword(EMPLOYEE_DEFAULT_PASSWORD);
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
