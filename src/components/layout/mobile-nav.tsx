"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { buildNavItems } from "@/components/layout/sidebar";
import { useSession } from "@/components/layout/session-provider";
import type { Role } from "@/lib/constants";

export function MobileNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { canViewExpenses, canViewUnbilledEntries } = useSession();
  const items = buildNavItems(role, canViewExpenses, canViewUnbilledEntries);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 md:hidden">
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-14 flex-row items-center gap-2 border-b px-4 py-0">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ClipboardCheck className="size-4.5" />
          </div>
          <SheetTitle className="text-sm">Task Tracker</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-0.5 p-3">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-accent",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
