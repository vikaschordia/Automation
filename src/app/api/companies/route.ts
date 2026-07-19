import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { companySchema } from "@/lib/validations/company";

export async function GET() {
  try {
    await requireSession(["ADMIN"]);
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { departments: true, employees: true, tasks: true } } },
    });
    return NextResponse.json({ companies });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireSession(["ADMIN"]);
    const body = await request.json().catch(() => null);
    const parsed = companySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const existing = await prisma.company.findUnique({ where: { code: parsed.data.code } });
    if (existing) {
      return NextResponse.json({ error: `Company code "${parsed.data.code}" is already in use` }, { status: 409 });
    }

    const company = await prisma.company.create({
      data: {
        name: parsed.data.name,
        code: parsed.data.code,
        address: parsed.data.address || null,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return NextResponse.json({ company }, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
