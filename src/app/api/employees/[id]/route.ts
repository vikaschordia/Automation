import { Prisma } from "@prisma/client";
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
        additionalCompanies: { select: { id: true, name: true }, orderBy: { name: "asc" } },
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
    const parsed = employeeSchema.partial().omit({ createLogin: true }).safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { additionalCompanyIds, ...data } = parsed.data;

    if (data.managerId === id) {
      return NextResponse.json({ error: "An employee cannot be their own manager" }, { status: 400 });
    }

    const employee = await prisma.$transaction(async (tx) => {
      // additionalCompanyIds must never include the (possibly just-changed) primary company.
      const primaryCompanyId = data.companyId ?? (await tx.employee.findUniqueOrThrow({ where: { id }, select: { companyId: true } })).companyId;

      const updated = await tx.employee.update({
        where: { id },
        data: {
          ...data,
          phone: data.phone === "" ? null : data.phone,
          managerId: data.managerId === "" ? null : data.managerId,
          ...(additionalCompanyIds !== undefined
            ? { additionalCompanies: { set: additionalCompanyIds.filter((cid) => cid !== primaryCompanyId).map((cid) => ({ id: cid })) } }
            : {}),
        },
        include: { additionalCompanies: { select: { id: true, name: true } } },
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
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: {
        // Soft-deleted tasks still exist as rows (deletedAt is just a flag) and still reference
        // this employee via the required assignedToId FK, so an unfiltered count here would keep
        // blocking deletion even after the user has "deleted" every one of their tasks in the UI.
        _count: { select: { assignedTasks: { where: { deletedAt: null } }, reports: true } },
      },
    });
    if (!employee) throw new ApiError(404, "Employee not found");
    if (employee._count.assignedTasks > 0) {
      throw new ApiError(
        409,
        "This employee has active tasks assigned to them. Delete or reassign those tasks first, or set them to Inactive instead of deleting.",
      );
    }
    if (employee._count.reports > 0) {
      throw new ApiError(409, "This employee manages other employees. Reassign those employees first.");
    }

    try {
      await prisma.$transaction([
        // Their soft-deleted tasks are already invisible everywhere in the app (there's no
        // restore UI yet) — purge them here so the leftover rows don't keep blocking the
        // employee record. This cascades away each task's TaskHistory automatically.
        prisma.task.deleteMany({ where: { assignedToId: id, deletedAt: { not: null } } }),
        prisma.user.deleteMany({ where: { employeeId: id } }),
        prisma.employee.delete({ where: { id } }),
      ]);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
        throw new ApiError(
          409,
          "This employee still has task history that can't be removed automatically (e.g. from a task later reassigned to someone else). Set them to Inactive instead of deleting.",
        );
      }
      throw err;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
