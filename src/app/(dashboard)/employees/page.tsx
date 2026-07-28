"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Users, Mail, Phone, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmployeeFormDialog } from "@/components/employees/employee-form-dialog";
import { useEmployees, useDeleteEmployee, type EmployeeRow } from "@/hooks/use-employees";
import { useCompanies } from "@/hooks/use-companies";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDate, initials } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MultiSelect } from "@/components/shared/multi-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function EmployeesPage() {
  const [companyFilter, setCompanyFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const { data: companies } = useCompanies();
  const { data: employees, isLoading } = useEmployees({
    companyId: companyFilter,
    status: statusFilter,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteEmployee();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);
  const [deleting, setDeleting] = useState<EmployeeRow | null>(null);

  return (
    <div>
      <PageHeader
        title="Employees"
        description="Employee master data — designation, department, company and reporting manager."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" /> Add employee
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search name, code, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64"
        />
        <MultiSelect
          value={companyFilter}
          onValueChange={setCompanyFilter}
          options={companies?.map((c) => ({ value: c.id, label: c.name })) ?? []}
          placeholder="All companies"
          className="w-48"
        />
        <MultiSelect
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: "ACTIVE", label: "Active" },
            { value: "INACTIVE", label: "Inactive" },
          ]}
          placeholder="All statuses"
          className="w-40"
        />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Designation</TableHead>
              <TableHead>Company / Dept</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead className="text-center">Tasks</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && employees?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  <Users className="mx-auto mb-2 size-8 opacity-40" />
                  No employees match these filters.
                </TableCell>
              </TableRow>
            )}
            {employees?.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">{initials(e.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium leading-tight">{e.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{e.employeeCode}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{e.designation}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 leading-tight">
                    {e.company.name}
                    {e.additionalCompanies.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
                            +{e.additionalCompanies.length}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          Also mapped to: {e.additionalCompanies.map((c) => c.name).join(", ")}
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{e.department.name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Mail className="size-3" /> {e.email}
                  </div>
                  {e.phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="size-3" /> {e.phone}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{e.manager?.name ?? "—"}</TableCell>
                <TableCell className="text-center">{e._count.assignedTasks}</TableCell>
                <TableCell>
                  <Badge variant={e.status === "ACTIVE" ? "default" : "secondary"}>
                    {e.status === "ACTIVE" ? "Active" : "Inactive"}
                  </Badge>
                  {e.user && <div className="mt-1 text-[11px] text-muted-foreground">Joined {formatDate(e.joiningDate)}</div>}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="size-8" title="Export employee report" asChild>
                      <a href={`/api/employees/${e.id}/export`}>
                        <Download className="size-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => {
                        setEditing(e);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setDeleting(e)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description="This can't be undone. Employees with tasks assigned can't be deleted — set them to Inactive instead."
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
