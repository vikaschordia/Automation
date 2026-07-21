import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { taskCreateSchema } from "@/lib/validations/task";
import { buildTaskOrderBy, buildTaskWhere, createTask, serializeTask, taskInclude } from "@/lib/services/task-service";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSession();
    const params = request.nextUrl.searchParams;

    const page = Math.max(1, Number(params.get("page")) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(params.get("pageSize")) || 25));
    const sortDir = params.get("sortDir") === "desc" ? "desc" : "asc";
    const orderBy = buildTaskOrderBy(params.get("sortBy") ?? "dueDate", sortDir);

    const where = buildTaskWhere(params, session);

    const [rows, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: taskInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.task.count({ where }),
    ]);

    return NextResponse.json({
      tasks: rows.map(serializeTask),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = taskCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const { task, linkedTasks } = await createTask(parsed.data, session);
    return NextResponse.json({ task, linkedTasks }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
