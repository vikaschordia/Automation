import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/constants";

const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8 hours, sliding (refreshed on activity by proxy.ts)

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: Role;
  employeeId: string | null;
  name: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (
      typeof payload.sub === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string" &&
      typeof payload.name === "string"
    ) {
      return {
        sub: payload.sub,
        email: payload.email,
        role: payload.role as Role,
        employeeId: (payload.employeeId as string | null) ?? null,
        name: payload.name,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_SECONDS;
