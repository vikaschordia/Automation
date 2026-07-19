import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/constants";
import { verifySession, type SessionPayload } from "@/lib/auth";
import type { Role } from "@/lib/constants";

/** Server Components / Route Handlers: read + verify the session cookie. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(ACCESS_TOKEN_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Route Handlers: throws ApiError(401/403) instead of returning null, so callers can just `await`. */
export async function requireSession(allowedRoles?: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new ApiError(401, "Not authenticated");
  if (allowedRoles && !allowedRoles.includes(session.role)) {
    throw new ApiError(403, "Not authorized");
  }
  return session;
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
