import { GlobalSearch } from "@/components/layout/global-search";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { UserNav } from "@/components/layout/user-nav";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { Role } from "@/lib/constants";

export function Topbar({ name, email, role }: { name: string; email: string; role: Role }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <MobileNav role={role} />
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <UserNav name={name} email={email} role={role} />
      </div>
    </header>
  );
}
