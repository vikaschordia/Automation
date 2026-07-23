import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { formatTaskNumber } from "@/lib/task-number";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return NextResponse.json({ tasks: [], employees: [] });

    const taskNumberMatch = /^(TSK-)?0*(\d+)$/i.exec(q);

    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        ...(session.role === "EMPLOYEE" ? { assignedToId: session.employeeId ?? "__none__" } : {}),
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          ...(taskNumberMatch ? [{ taskNumber: Number(taskNumberMatch[2]) }] : []),
        ],
      },
      take: 8,
      orderBy: { updatedAt: "desc" },
      include: { assignedTo: { select: { name: true } } },
    });

    const employees =
      session.role === "ADMIN"
        ? await prisma.employee.findMany({
            where: {
              OR: [{ name: { contains: q } }, { employeeCode: { contains: q } }, { email: { contains: q } }],
            },
            take: 8,
          })
        : [];

    return NextResponse.json({
      tasks: tasks.map((t) => ({
        id: t.id,
        taskNumber: formatTaskNumber(t.taskNumber),
        title: t.title,
        status: t.status,
        assignedToName: t.assignedTo.name,
      })),
      employees: employees.map((e) => ({ id: e.id, name: e.name, employeeCode: e.employeeCode, designation: e.designation })),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
