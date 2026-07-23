"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, ListTodo, User, Loader2 } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { STATUS_META, type TaskStatus } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";

interface SearchResults {
  tasks: { id: string; taskNumber: string; title: string; status: string; assignedToName: string }[];
  employees: { id: string; name: string; employeeCode: string; designation: string }[];
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(query, 250);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, isFetching } = useQuery<SearchResults>({
    queryKey: ["global-search", debounced],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(debounced)}`);
      if (!res.ok) return { tasks: [], employees: [] };
      return res.json();
    },
    enabled: debounced.trim().length >= 2,
  });

  const hasResults = (data?.tasks.length ?? 0) > 0 || (data?.employees.length ?? 0) > 0;

  return (
    <Popover open={open && debounced.trim().length >= 2}>
      <PopoverAnchor asChild>
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            placeholder="Search tasks, employees..."
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          />
          {isFetching && (
            <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) min-w-80 p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {!hasResults && !isFetching && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">No results for &ldquo;{debounced}&rdquo;</p>
        )}
        {(data?.tasks.length ?? 0) > 0 && (
          <div className="py-1">
            <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Tasks</p>
            {data!.tasks.map((t) => (
              <button
                key={t.id}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={() => {
                  router.push(`/tasks/${t.id}`);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <ListTodo className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-mono text-xs text-muted-foreground">{t.taskNumber}</span> {t.title}
                </span>
                <Badge variant="outline" className={STATUS_META[t.status as TaskStatus].badgeClass}>
                  {STATUS_META[t.status as TaskStatus].label}
                </Badge>
              </button>
            ))}
          </div>
        )}
        {(data?.employees.length ?? 0) > 0 && (
          <div className="border-t py-1">
            <p className="px-2.5 py-1 text-xs font-medium text-muted-foreground">Employees</p>
            {data!.employees.map((e) => (
              <button
                key={e.id}
                className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm hover:bg-accent"
                onMouseDown={() => {
                  router.push(`/employees?highlight=${e.id}`);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <User className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate">{e.name}</span>
                <span className="text-xs text-muted-foreground">{e.employeeCode}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
