"use client";

import { createContext, useContext } from "react";
import type { Role } from "@/lib/constants";

export interface ClientSession {
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
}

const SessionContext = createContext<ClientSession | null>(null);

export function SessionProvider({ session, children }: { session: ClientSession; children: React.ReactNode }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): ClientSession {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
