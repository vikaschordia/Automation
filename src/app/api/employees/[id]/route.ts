import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { employeeSchema } from "@/lib/validations/employee";

type Params = Promise<{ id: string }>;

export async function GET(_request: NextRequest, { params }: { params: Params }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true } },
        user: { select: { id: true, isActive: true, lastLoginAt: true } },
      },
    });
    if (!employee) throw new ApiError(404, "Employee not found");
    return NextResponse.json({ employee });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = employeeSchema.partial().omit({ createLogin: true, password: true }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const data = parsed.data;

    if (data.managerId === id) {
      return NextResponse.json({ error: "An employee cannot be their own manager" }, { status: 400 });
    }

    const employee = await prisma.$transaction(async (tx) => {
      const updated = await tx.employee.update({
        where: { id },
        data: {
          ...data,
          phone: data.phone === "" ? null : data.phone,
          managerId: data.managerId === "" ? null : data.managerId,
        },
      });
      if (data.status || data.email) {
        await tx.user.updateMany({
          where: { employeeId: id },
          data: {
            ...(data.status ? { isActive: data.status === "ACTIVE" } : {}),
            ...(data.email ? { email: data.email } : {}),
          },
        });
      }
      return updated;
    });

    return NextResponse.json({ employee });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const counts = await prisma.employee.findUnique({
      where: { id },
      select: { _count: { select: { assignedTasks: true, reports: true } } },
    });
    if (!counts) throw new ApiError(404, "Employee not found");
    if (counts._count.assignedTasks > 0) {
      throw new ApiError(409, "This employee has tasks assigned to them. Set them to Inactive instead of deleting.");
    }
    if (counts._count.reports > 0) {
      throw new ApiError(409, "This employee manages other employees. Reassign those employees first.");
    }
    await prisma.$transaction([
      prisma.user.deleteMany({ where: { employeeId: id } }),
      prisma.employee.delete({ where: { id } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
