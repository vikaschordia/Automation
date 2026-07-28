"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, Plus, Pencil, Trash2, CircleCheck, Undo2, Wallet } from "lucide-react";
import { useSession } from "@/components/layout/session-provider";
import { useCompanies } from "@/hooks/use-companies";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { MarkPaidDialog } from "@/components/expenses/mark-paid-dialog";
import { ExpenseStatusBadge } from "@/components/expenses/expense-status-badge";
import { useExpenses, useUpdateExpense, useDeleteExpense, type ExpenseRow } from "@/hooks/use-expenses";
import { formatDate, formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MultiSelect } from "@/components/shared/multi-select";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const total = year * 12 + (month - 1) + delta;
  return { year: Math.floor(total / 12), month: (total % 12) + 1 };
}

export default function ExpensesPage() {
  const { role, canViewExpenses } = useSession();
  const canManage = role === "ADMIN" || canViewExpenses;
  const columnCount = canManage ? 9 : 8;

  const { data: companies } = useCompanies();
  const [activeCompanyIds, setActiveCompanyIds] = useState<string[]>([]);
  const activeCompanyName = activeCompanyIds.length === 1 ? companies?.find((c) => c.id === activeCompanyIds[0])?.name : undefined;

  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });

  const { data, isLoading } = useExpenses(cursor.year, cursor.month, activeCompanyIds);
  const expenses = data?.expenses ?? [];
  const updateMutation = useUpdateExpense();
  const deleteMutation = useDeleteExpense();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [marking, setMarking] = useState<ExpenseRow | null>(null);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const paidAmount = expenses.filter((e) => e.status === "PAID").reduce((sum, e) => sum + e.amount, 0);

  return (
    <div>
      <PageHeader
        title="Monthly Expenses"
        description="Track fixed monthly expenses — rent, subscriptions, and other recurring bills."
        actions={
          canManage ? (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" /> Add expense
            </Button>
          ) : undefined
        }
      />

      {companies && companies.length > 0 && (
        <MultiSelect
          value={activeCompanyIds}
          onValueChange={setActiveCompanyIds}
          options={companies.map((c) => ({ value: c.id, label: c.name }))}
          placeholder="All Companies"
          className="mb-4 w-56"
        />
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
                <span className="font-medium text-emerald-600">{formatCurrency(paidAmount)}</span> paid
              </>
            )}
          </p>
          <Button asChild variant="outline">
            <a
              href={`/api/expenses/export?year=${cursor.year}&month=${cursor.month}${activeCompanyIds.length ? `&companyId=${activeCompanyIds.join(",")}` : ""}`}
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
              <TableHead>Expense Name</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Recurring</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Paid Date</TableHead>
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
            {!isLoading && expenses.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-12 text-center text-sm text-muted-foreground">
                  <Wallet className="mx-auto mb-2 size-8 opacity-40" />
                  No expenses for {MONTH_NAMES[cursor.month - 1]} {cursor.year}
                  {activeCompanyName ? ` (${activeCompanyName})` : ""}.{canManage && " Add one to get started."}
                </TableCell>
              </TableRow>
            )}
            {expenses.map((e) => (
              <TableRow key={e.id} className={cn(e.status === "PAID" && "bg-emerald-50/60 dark:bg-emerald-950/10")}>
                <TableCell className="font-medium">{e.name}</TableCell>
                <TableCell className="text-muted-foreground">{e.company.name}</TableCell>
                <TableCell>{formatDate(e.dueDate)}</TableCell>
                <TableCell className="text-right">{formatCurrency(e.amount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={e.isRecurring ? "" : "text-muted-foreground"}>
                    {e.isRecurring ? "Recurring" : "One-time"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ExpenseStatusBadge status={e.status} />
                </TableCell>
                <TableCell>{formatDate(e.paidDate)}</TableCell>
                <TableCell className="max-w-48 truncate text-muted-foreground" title={e.remarks || undefined}>{e.remarks || "—"}</TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {e.status === "UNPAID" ? (
                        <Button variant="ghost" size="icon" className="size-7" title="Mark Paid" onClick={() => setMarking(e)}>
                          <CircleCheck className="size-3.5 text-emerald-600" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          title="Mark Unpaid"
                          onClick={() => updateMutation.mutate({ id: e.id, input: { status: "UNPAID" } })}
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
          <ExpenseFormDialog
            open={formOpen}
            onOpenChange={setFormOpen}
            expense={editing}
            year={cursor.year}
            month={cursor.month}
            defaultCompanyId={activeCompanyIds.length === 1 ? activeCompanyIds[0] : undefined}
          />

          <MarkPaidDialog
            open={!!marking}
            onOpenChange={(o) => !o && setMarking(null)}
            loading={updateMutation.isPending}
            expenseName={marking?.name}
            onConfirm={(paidDate) =>
              updateMutation.mutate(
                { id: marking!.id, input: { status: "PAID", paidDate } },
                { onSuccess: () => setMarking(null) },
              )
            }
          />

          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={`Delete "${deleting?.name}"?`}
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
