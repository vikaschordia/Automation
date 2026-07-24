import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { taskCategorySchema } from "@/lib/validations/task-category";
import { logAudit } from "@/lib/services/audit-service";

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = taskCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const nameOwner = await prisma.taskCategory.findUnique({ where: { name: parsed.data.name } });
    if (nameOwner && nameOwner.id !== id) {
      return NextResponse.json({ error: `A category named "${parsed.data.name}" already exists` }, { status: 409 });
    }

    const category = await prisma.taskCategory.update({ where: { id }, data: { name: parsed.data.name } });
    await logAudit({ session, action: "UPDATE", entityType: "CATEGORY", entityId: id, summary: `Renamed category to "${category.name}"` });
    return NextResponse.json({ category });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    const category = await prisma.taskCategory.findUnique({
      where: { id },
      select: { name: true, _count: { select: { tasks: true } } },
    });
    if (!category) throw new ApiError(404, "Category not found");
    if (category._count.tasks > 0) {
      throw new ApiError(409, "This category is used by existing tasks and can't be deleted. Rename it instead if needed.");
    }
    await prisma.taskCategory.delete({ where: { id } });
    await logAudit({ session, action: "DELETE", entityType: "CATEGORY", entityId: id, summary: `Deleted category "${category.name}"` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
