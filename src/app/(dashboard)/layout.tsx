import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SessionProvider } from "@/components/layout/session-provider";
import { NotesWidget } from "@/components/notes/notes-widget";
import { ChatWidget } from "@/components/chat/chat-widget";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const employeeAccess =
    session.role !== "ADMIN" && session.employeeId
      ? await prisma.employee.findUnique({
          where: { id: session.employeeId },
          select: { canViewExpenses: true, canViewUnbilledEntries: true },
        })
      : null;
  const canViewExpenses = session.role === "ADMIN" || !!employeeAccess?.canViewExpenses;
  const canViewUnbilledEntries = session.role === "ADMIN" || !!employeeAccess?.canViewUnbilledEntries;

  return (
    <SessionProvider
      session={{
        userId: session.sub,
        name: session.name,
        email: session.email,
        role: session.role,
        employeeId: session.employeeId,
        canViewExpenses,
        canViewUnbilledEntries,
      }}
    >
      <div className="flex h-svh w-full overflow-hidden">
        <Sidebar role={session.role} canViewExpenses={canViewExpenses} canViewUnbilledEntries={canViewUnbilledEntries} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={session.name} email={session.email} role={session.role} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <NotesWidget />
      <ChatWidget />
    </SessionProvider>
  );
}
