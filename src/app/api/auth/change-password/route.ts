import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, apiErrorResponse } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validations/auth";
import { logAudit } from "@/lib/services/audit-service";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json().catch(() => null);
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.sub } });
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const currentValid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!currentValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await logAudit({ session, action: "UPDATE", entityType: "AUTH", entityId: user.id, summary: `${session.name} changed their password` });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
