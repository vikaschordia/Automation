import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { companySchema } from "@/lib/validations/company";

type Params = Promise<{ id: string }>;

export async function PATCH(request: NextRequest, { params }: { params: Params }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = companySchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    if (parsed.data.code) {
      const codeOwner = await prisma.company.findUnique({ where: { code: parsed.data.code } });
      if (codeOwner && codeOwner.id !== id) {
        return NextResponse.json({ error: `Company code "${parsed.data.code}" is already in use` }, { status: 409 });
      }
    }

    const company = await prisma.company.update({
      where: { id },
      data: {
        ...parsed.data,
        address: parsed.data.address === "" ? null : parsed.data.address,
      },
    });
    return NextResponse.json({ company });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Params }) {
  try {
    await requireSession(["ADMIN"]);
    const { id } = await params;
    const counts = await prisma.company.findUnique({
      where: { id },
      select: { _count: { select: { departments: true, employees: true, tasks: true } } },
    });
    if (!counts) throw new ApiError(404, "Company not found");
    if (counts._count.departments > 0 || counts._count.employees > 0 || counts._count.tasks > 0) {
      throw new ApiError(
        409,
        "This company still has departments, employees or tasks attached. Deactivate it instead of deleting.",
      );
    }
    await prisma.company.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
