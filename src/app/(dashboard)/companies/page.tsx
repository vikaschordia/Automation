"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { useCompanies, useDeleteCompany, type CompanyRow } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CompaniesPage() {
  const { data: companies, isLoading } = useCompanies();
  const deleteMutation = useDeleteCompany();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [deleting, setDeleting] = useState<CompanyRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Organizations your team's tasks are tracked against."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add company
          </Button>
        }
      />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Address</TableHead>
              <TableHead className="text-center">Departments</TableHead>
              <TableHead className="text-center">Employees</TableHead>
              <TableHead className="text-center">Tasks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && companies?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  <Building2 className="mx-auto mb-2 size-8 opacity-40" />
                  No companies yet. Add your first company to get started.
                </TableCell>
              </TableRow>
            )}
            {companies?.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.code}</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.address || "—"}</TableCell>
                <TableCell className="text-center">{c._count.departments}</TableCell>
                <TableCell className="text-center">{c._count.employees}</TableCell>
                <TableCell className="text-center">{c._count.tasks}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? "default" : "secondary"}>{c.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleting(c)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CompanyFormDialog open={formOpen} onOpenChange={setFormOpen} company={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This can't be undone. Companies with departments, employees or tasks attached can't be deleted — deactivate them instead."
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          await deleteMutation.mutateAsync(deleting.id);
          setDeleting(null);
        }}
      />
    </div>
  );
}
