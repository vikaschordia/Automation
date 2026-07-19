"use client";

import Link from "next/link";
import { CalendarClock, AlarmClockOff, CalendarPlus, Flame } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { formatDate } from "@/lib/format";
import type { AlertTask } from "@/hooks/use-dashboard";

const TABS = [
  { key: "overdue", label: "Overdue", icon: AlarmClockOff },
  { key: "dueToday", label: "Due Today", icon: CalendarClock },
  { key: "dueTomorrow", label: "Due Tomorrow", icon: CalendarPlus },
  { key: "highPriority", label: "High Priority", icon: Flame },
] as const;

export function AlertsPanel({ alerts }: { alerts: Record<(typeof TABS)[number]["key"], AlertTask[]> }) {
  return (
    <Tabs defaultValue="overdue">
      <TabsList className="w-full max-w-full justify-start overflow-x-auto">
        {TABS.map((t) => (
          <TabsTrigger key={t.key} value={t.key} className="shrink-0 gap-1.5 text-xs">
            <t.icon className="size-3.5" />
            {t.label}
            {alerts[t.key].length > 0 && (
              <span className="ml-0.5 rounded-full bg-muted px-1.5 text-[10px] font-semibold">{alerts[t.key].length}</span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {TABS.map((t) => (
        <TabsContent key={t.key} value={t.key} className="mt-3 flex flex-col gap-1">
          {alerts[t.key].length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here. Nice.</p>}
          {alerts[t.key].map((task) => (
            <Link
              key={task.id}
              href={`/tasks/${task.id}`}
              className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{task.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {task.assignedToName} · Due {formatDate(task.dueDate)}
                </p>
              </div>
              <PriorityBadge priority={task.priority} className="shrink-0" />
            </Link>
          ))}
        </TabsContent>
      ))}
    </Tabs>
  );
}
