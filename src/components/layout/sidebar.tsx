"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Table2,
  Building2,
  Network,
  Users,
  FileBarChart2,
  ClipboardCheck,
  ListTodo,
  Tag,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/constants";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "Tasks", icon: Table2 },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/departments", label: "Departments", icon: Network },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/expenses", label: "Monthly Expenses", icon: Wallet },
];

export const EMPLOYEE_NAV: NavItem[] = [
  { href: "/my-tasks", label: "My Dashboard", icon: LayoutDashboard },
  { href: "/tasks", label: "My Tasks", icon: ListTodo },
];

export function Sidebar({ role, canViewExpenses }: { role: Role; canViewExpenses?: boolean }) {
  const pathname = usePathname();
  const items =
    role === "ADMIN"
      ? ADMIN_NAV
      : canViewExpenses
        ? [...EMPLOYEE_NAV, { href: "/expenses", label: "Monthly Expenses", icon: Wallet }]
        : EMPLOYEE_NAV;

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <ClipboardCheck className="size-4.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Task Tracker</span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
