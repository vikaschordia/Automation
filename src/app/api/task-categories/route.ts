import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { taskCategorySchema } from "@/lib/validations/task-category";

export async function GET() {
  try {
    await requireSession();
    const categories = await prisma.taskCategory.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { tasks: true } } },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = taskCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const existing = await prisma.taskCategory.findUnique({ where: { name: parsed.data.name } });
    if (existing) return NextResponse.json({ category: existing });
    const category = await prisma.taskCategory.create({ data: { name: parsed.data.name } });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
