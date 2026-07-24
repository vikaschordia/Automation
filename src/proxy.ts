import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession, signSession, SESSION_MAX_AGE } from "@/lib/auth";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/prisma";

// Next.js 16 renamed middleware.ts -> proxy.ts (function `proxy`). Runs in the Node.js
// runtime, which is what we need anyway since it shares code with the route handlers.
const ADMIN_ONLY_PREFIXES = ["/dashboard", "/companies", "/departments", "/employees", "/categories", "/audit-log"];
// Admin-only by default, but an individual employee can be opted in (Employee.canViewExpenses /
// Employee.canViewUnbilledEntries) — checked separately below instead of via the blanket
// admin-only list.
const CONDITIONAL_PREFIXES = [
  { prefix: "/expenses", field: "canViewExpenses" },
  { prefix: "/unbilled-entries", field: "canViewUnbilledEntries" },
] as const;
const PUBLIC_PATHS = ["/login"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith("/api/auth/login")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  if (!session) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/") {
    const dest = session.role === "ADMIN" ? "/dashboard" : "/my-tasks";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  const isAdminOnlyPath = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  if (isAdminOnlyPath && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/my-tasks", request.url));
  }

  const conditionalMatch = CONDITIONAL_PREFIXES.find((p) => pathname.startsWith(p.prefix));
  if (conditionalMatch && session.role !== "ADMIN") {
    const employee = session.employeeId
      ? await prisma.employee.findUnique({
          where: { id: session.employeeId },
          select: { canViewExpenses: true, canViewUnbilledEntries: true },
        })
      : null;
    if (!employee?.[conditionalMatch.field]) {
      return NextResponse.redirect(new URL("/my-tasks", request.url));
    }
  }

  // Sliding expiration: re-issue the cookie with a fresh TTL on every authenticated request.
  const response = NextResponse.next();
  const refreshed = await signSession(session);
  response.cookies.set(ACCESS_TOKEN_COOKIE, refreshed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
