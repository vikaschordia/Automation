import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { SessionProvider } from "@/components/layout/session-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={{ name: session.name, email: session.email, role: session.role, employeeId: session.employeeId }}>
      <div className="flex h-svh w-full overflow-hidden">
        <Sidebar role={session.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar name={session.name} email={session.email} role={session.role} />
          <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
