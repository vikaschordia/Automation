import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { departmentSchema } from "@/lib/validations/department";

export async function GET(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const companyId = request.nextUrl.searchParams.get("companyId") ?? undefined;
    const departments = await prisma.department.findMany({
      where: companyId ? { companyId } : undefined,
      orderBy: [{ company: { name: "asc" } }, { name: "asc" }],
      include: { company: { select: { id: true, name: true } }, _count: { select: { employees: true, tasks: true } } },
    });
    return NextResponse.json({ departments });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = departmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const duplicate = await prisma.department.findUnique({
      where: { name_companyId: { name: parsed.data.name, companyId: parsed.data.companyId } },
    });
    if (duplicate) {
      return NextResponse.json({ error: "This department already exists for the selected company" }, { status: 409 });
    }

    const department = await prisma.department.create({
      data: {
        name: parsed.data.name,
        companyId: parsed.data.companyId,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
