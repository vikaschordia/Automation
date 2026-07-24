import { NextRequest, NextResponse } from "next/server";
import { requireSession, apiErrorResponse, ApiError } from "@/lib/session";
import { assertUnbilledEntryAccess, resolveAccessibleCompanyFilter } from "@/lib/rbac";
import { unbilledEntryUpdateSchema } from "@/lib/validations/unbilled-entry";
import { updateUnbilledEntry, deleteUnbilledEntry } from "@/lib/services/unbilled-entry-service";
import { logAudit } from "@/lib/services/audit-service";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    await assertUnbilledEntryAccess(session);
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = unbilledEntryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const existing = await prisma.unbilledEntry.findUnique({ where: { id }, select: { companyId: true } });
    if (!existing) throw new ApiError(404, "Entry not found");
    await resolveAccessibleCompanyFilter(session, existing.companyId);
    if (parsed.data.companyId) await resolveAccessibleCompanyFilter(session, parsed.data.companyId);
    const entry = await updateUnbilledEntry(id, parsed.data);
    await logAudit({
      session,
      action: "UPDATE",
      entityType: "UNBILLED_ENTRY",
      entityId: id,
      summary: `Updated unbilled entry "${entry.description}"`,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    await assertUnbilledEntryAccess(session);
    const { id } = await params;
    const existing = await prisma.unbilledEntry.findUnique({ where: { id }, select: { description: true, companyId: true } });
    if (!existing) throw new ApiError(404, "Entry not found");
    await resolveAccessibleCompanyFilter(session, existing.companyId);
    await deleteUnbilledEntry(id);
    await logAudit({
      session,
      action: "DELETE",
      entityType: "UNBILLED_ENTRY",
      entityId: id,
      summary: `Deleted unbilled entry "${existing.description}"`,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
