import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, verifyPassword, SESSION_MAX_AGE } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { logAudit } from "@/lib/services/audit-service";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";
import type { Role } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const identifier = parsed.data.identifier.trim();
  const normalizedEmail = identifier.toLowerCase();
  const rateLimitKey = `${ip}:${normalizedEmail}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 },
    );
  }

  const user = identifier.includes("@")
    ? await prisma.user.findUnique({ where: { email: normalizedEmail } })
    : await prisma.user.findFirst({
        where: {
          role: "EMPLOYEE",
          employee: { name: { equals: identifier } },
        },
      });
  if (!user || !user.isActive) {
    await logAudit({
      session: null,
      action: "LOGIN_FAILED",
      entityType: "AUTH",
      summary: `Failed login attempt for "${identifier}"`,
      actorNameOverride: identifier,
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    await logAudit({
      session: null,
      action: "LOGIN_FAILED",
      entityType: "AUTH",
      entityId: user.id,
      summary: `Failed login attempt for "${identifier}" (wrong password)`,
      actorNameOverride: identifier,
    });
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);

  const employee = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId } })
    : null;

  const session = {
    sub: user.id,
    email: user.email,
    role: user.role as Role,
    employeeId: user.employeeId,
    name: employee?.name ?? user.email,
  };
  const token = await signSession(session);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit({ session, action: "LOGIN", entityType: "AUTH", entityId: user.id, summary: `${session.name} logged in` });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role, name: employee?.name ?? user.email },
  });
  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
