"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, Pencil, Trash2, CircleCheck, Undo2, FileClock } from "lucide-react";
import { useSession } from "@/components/layout/session-provider";
import { useCompanies } from "@/hooks/use-companies";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EntryFormDialog } from "@/components/unbilled-entries/entry-form-dialog";
import { MarkDoneDialog } from "@/components/unbilled-entries/mark-done-dialog";
import { UnbilledEntryStatusBadge } from "@/components/unbilled-entries/status-badge";
import { useUnbilledEntries, useUpdateUnbilledEntry, useDeleteUnbilledEntry, type UnbilledEntryRow } from "@/hooks/use-unbilled-entries";
import { formatDate, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export default function UnbilledEntriesPage() {
  const { role, canViewUnbilledEntries } = useSession();
  const canManage = role === "ADMIN" || canViewUnbilledEntries;
  const columnCount = canManage ? 8 : 7;

  const { data: companies } = useCompanies();
  const [activeCompanyId, setActiveCompanyId] = useState<string>("all");
  const activeCompanyName = activeCompanyId === "all" ? undefined : companies?.find((c) => c.id === activeCompanyId)?.name;

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data, isLoading } = useUnbilledEntries(cursor.year, cursor.month, activeCompanyId === "all" ? undefined : activeCompanyId);
  const entries = data?.entries ?? [];
  const updateMutation = useUpdateUnbilledEntry();
  const deleteMutation = useDeleteUnbilledEntry();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UnbilledEntryRow | null>(null);
  const [deleting, setDeleting] = useState<UnbilledEntryRow | null>(null);
  const [marking, setMarking] = useState<UnbilledEntryRow | null>(null);

  const totalAmount = entries.reduce((sum, e) => sum + e.expectedAmount, 0);
  const doneAmount = entries.filter((e) => e.status === "DONE").reduce((sum, e) => sum + e.expectedAmount, 0);

  return (
    <div>
      <PageHeader
        title="Monthly Unbilled Entries"
        description="Track entries expected but not yet billed — description, expected date, expected amount, and status."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Add entry
            </Button>
          ) : undefined
        }
      />

      {companies && companies.length > 0 && (
        <Tabs value={activeCompanyId} onValueChange={setActiveCompanyId} className="mb-4">
          <TabsList>
            <TabsTrigger value="all">All Companies</TabsTrigger>
            {companies.map((c) => (
              <TabsTrigger key={c.id} value={c.id}>
                {c.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, -1))}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-40 text-center text-sm font-semibold">
            {MONTH_NAMES[cursor.month - 1]} {cursor.year}
          </span>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => shiftMonth(c.year, c.month, 1))}>
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() + 1 })}
          >
            This month
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : (
              <>
                <span className="font-medium text-foreground">{formatCurrency(totalAmount)}</span> total ·{" "}
                <span className="font-medium text-emerald-600">{formatCurrency(doneAmount)}</span> done
              </>
            )}
          </p>
          <Button asChild variant="outline">
            <a
              href={`/api/unbilled-entries/export?year=${cursor.year}&month=${cursor.month}${activeCompanyId !== "all" ? `&companyId=${activeCompanyId}` : ""}`}
            >
              <Download className="size-4" /> Export to Excel
            </a>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Expected Date</TableHead>
              <TableHead className="text-right">Expected Amount</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Entry Done Date</TableHead>
              <TableHead>Remarks</TableHead>
              {canManage && <TableHead className="w-28 text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: columnCount }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-12 text-center text-sm text-muted-foreground">
                  <FileClock className="mx-auto mb-2 size-8 opacity-40" />
                  No entries for {MONTH_NAMES[cursor.month - 1]} {cursor.year}
                  {activeCompanyName ? ` (${activeCompanyName})` : ""}.{canManage && " Add one to get started."}
                </TableCell>
              </TableRow>
            )}
            {entries.map((e) => (
              <TableRow key={e.id} className={cn(e.status === "DONE" && "bg-emerald-50/60 dark:bg-emerald-950/10")}>
                <TableCell className="font-medium">{e.description}</TableCell>
                <TableCell className="text-muted-foreground">{e.company.name}</TableCell>
                <TableCell>{formatDate(e.expectedDate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(e.expectedAmount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={e.isRecurring ? "" : "text-muted-foreground"}>
                    {e.isRecurring ? "Recurring" : "One-time"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <UnbilledEntryStatusBadge status={e.status} />
                </TableCell>
                <TableCell>{formatDate(e.entryDoneDate)}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground" title={e.remarks || undefined}>{e.remarks || "—"}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {e.status === "PENDING" ? (
                        <Button variant="ghost" size="icon" className="size-7" title="Mark Done" onClick={() => setMarking(e)}>
                          <CircleCheck className="size-3.5 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Mark Pending"
                          onClick={() => updateMutation.mutate({ id: e.id, input: { status: "PENDING" } })}
                        >
                          <Undo2 className="size-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => { setEditing(e); setFormOpen(true); }}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" onClick={() => setDeleting(e)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {canManage && (
        <>
          <EntryFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            entry={editing}
            year={cursor.year}
            month={cursor.month}
            defaultCompanyId={activeCompanyId === "all" ? undefined : activeCompanyId}
          />

          <MarkDoneDialog
            open={!!marking}
            onOpenChange={(o) => !o && setMarking(null)}
            loading={updateMutation.isPending}
            entryDescription={marking?.description}
            onConfirm={(entryDoneDate) =>
              updateMutation.mutate(
                { id: marking!.id, input: { status: "DONE", entryDoneDate } },
                { onSuccess: () => setMarking(null) },
              )
            }
          />

          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete "${deleting?.description}"?`}
            description="This can't be undone. If this is part of a recurring series, only this month's entry is removed."
            confirmLabel="Delete"
            loading={deleteMutation.isPending}
            onConfirm={async () => {
              if (!deleting) return;
              await deleteMutation.mutateAsync(deleting.id);
              setDeleting(null);
            }}
          />
        </>
      )}
    </div>
  );
}
