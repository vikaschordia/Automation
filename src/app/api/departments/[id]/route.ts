import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { departmentSchema } from "@/lib/validations/department";
import { logAudit } from "@/lib/services/audit-service";

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = departmentSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const department = await prisma.department.update({ where: { id }, data: parsed.data });
    await logAudit({ session, action: "UPDATE", entityType: "DEPARTMENT", entityId: id, summary: `Updated department "${department.name}"` });
    return NextResponse.json({ department });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    const session = await requireSession(["ADMIN"]);
    const { id } = await params;
    const counts = await prisma.department.findUnique({
      where: { id },
      select: { name: true, _count: { select: { employees: true, tasks: true } } },
    });
    if (!counts) throw new ApiError(404, "Department not found");
    if (counts._count.employees > 0 || counts._count.tasks > 0) {
      throw new ApiError(409, "This department still has employees or tasks attached. Deactivate it instead of deleting.");
    }
    await prisma.department.delete({ where: { id } });
    await logAudit({ session, action: "DELETE", entityType: "DEPARTMENT", entityId: id, summary: `Deleted department "${counts.name}"` });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
