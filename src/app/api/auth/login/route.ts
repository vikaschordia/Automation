import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, verifyPassword, SESSION_MAX_AGE } from "@/lib/auth";
import { loginSchema } from "@/lib/validations/auth";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";
import type { Role } from "@/lib/constants";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "local";
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const rateLimitKey = `${ip}:${parsed.data.email}`;
  const rateLimit = checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.` },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !user.isActive) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const passwordValid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!passwordValid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  resetRateLimit(rateLimitKey);

  const employee = user.employeeId
    ? await prisma.employee.findUnique({ where: { id: user.employeeId } })
    : null;

  const token = await signSession({
    sub: user.id,
    email: user.email,
    role: user.role as Role,
    employeeId: user.employeeId,
    name: employee?.name ?? user.email,
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

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
