import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SessionProvider } from "@/components/layout/session-provider";
import { NotesWidget } from "@/components/notes/notes-widget";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const canViewExpenses =
    session.role === "ADMIN"
      ? true
      : !!(session.employeeId &&
          (await prisma.employee.findUnique({ where: { id: session.employeeId }, select: { canViewExpenses: true } }))?.canViewExpenses);

  return (
    <SessionProvider session={{ name: session.name, email: session.email, role: session.role, employeeId: session.employeeId }}>
      <div className="flex h-svh w-full overflow-hidden">
        <Sidebar role={session.role} canViewExpenses={canViewExpenses} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={session.name} email={session.email} role={session.role} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">{children}</main>
        </div>
      </div>
      <NotesWidget />
    </SessionProvider>
  );
}
