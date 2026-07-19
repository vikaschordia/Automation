"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Network } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DepartmentFormDialog } from "@/components/departments/department-form-dialog";
import { useDepartments, useDeleteDepartment, type DepartmentRow } from "@/hooks/use-departments";
import { useCompanies } from "@/hooks/use-companies";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DepartmentsPage() {
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const { data: companies } = useCompanies();
  const { data: departments, isLoading } = useDepartments(companyFilter === "all" ? undefined : companyFilter);
  const deleteMutation = useDeleteDepartment();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentRow | null>(null);
  const [deleting, setDeleting] = useState<DepartmentRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Departments organize employees and tasks within a company."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add department
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Select value={companyFilter} onValueChange={setCompanyFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All companies</SelectItem>
            {companies?.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-center">Employees</TableHead>
              <TableHead className="text-center">Tasks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && departments?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                  <Network className="mx-auto mb-2 size-8 opacity-40" />
                  No departments yet.
                </TableCell>
              </TableRow>
            )}
            {departments?.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.name}</TableCell>
                <TableCell className="text-muted-foreground">{d.company.name}</TableCell>
                <TableCell className="text-center">{d._count.employees}</TableCell>
                <TableCell className="text-center">{d._count.tasks}</TableCell>
                <TableCell>
                  <Badge variant={d.isActive ? "default" : "secondary"}>{d.isActive ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditing(d);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleting(d)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DepartmentFormDialog open={formOpen} onOpenChange={setFormOpen} department={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This can't be undone. Departments with employees or tasks attached can't be deleted — deactivate them instead."
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
