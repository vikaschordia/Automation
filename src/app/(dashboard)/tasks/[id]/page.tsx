"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2, Loader2, Building2, Network, User, Tag, Clock } from "lucide-react";
import { useSession } from "@/components/layout/session-provider";
import { useTask, useUpdateTask, useDeleteTask, type TaskRow } from "@/hooks/use-tasks";
import { PriorityBadge } from "@/components/tasks/priority-badge";
import { StatusBadge } from "@/components/tasks/status-badge";
import { TaskTimeline } from "@/components/tasks/task-timeline";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { CompleteTaskDialog } from "@/components/tasks/complete-task-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate, toDateInputValue } from "@/lib/format";
import { TASK_STATUSES, STATUS_META } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = Number(id);
  const router = useRouter();
  const { role } = useSession();
  const { data, isLoading } = useTask(taskId);
  const updateMutation = useUpdateTask();
  const deleteMutation = useDeleteTask();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [remarks, setRemarks] = useState<string | null>(null);

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl">
        <Skeleton className="mb-4 h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const task: TaskRow = data.task;
  const history = data.history;
  const progressValue = progress ?? task.progressPercent;
  const remarksValue = remarks ?? task.remarks ?? "";

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-3 -ml-2" onClick={() => router.back()}>
        <ArrowLeft className="size-4" /> Back
      </Button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-mono">{task.taskNumber}</span>
            <PriorityBadge priority={task.priority} />
            <StatusBadge status={task.status} />
            {task.isOverdue && <span className="text-xs font-medium text-red-600">Overdue by {task.delayDays}d</span>}
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{task.title}</h1>
        </div>
        {role === "ADMIN" && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" /> Edit
            </Button>
            <Button variant="outline" className="text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" /> Delete
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">{task.description || "No description provided."}</p>

              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <InfoItem icon={User} label="Assigned to" value={task.assignedTo.name} />
                <InfoItem icon={Building2} label="Company" value={task.company.name} />
                <InfoItem icon={Network} label="Department" value={task.department.name} />
                <InfoItem icon={Clock} label="Assigned date" value={formatDate(task.assignedDate)} />
                <InfoItem icon={Clock} label="Due date" value={formatDate(task.dueDate)} />
                <InfoItem icon={Clock} label="Completed date" value={formatDate(task.completedDate)} />
                {task.category && <InfoItem icon={Tag} label="Category" value={task.category.name} />}
                {task.estimatedHours != null && <InfoItem icon={Clock} label="Estimated hours" value={`${task.estimatedHours}h`} />}
                {task.actualHours != null && <InfoItem icon={Clock} label="Actual hours" value={`${task.actualHours}h`} />}
              </div>

              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update progress</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>Status</Label>
                <Select
                  value={task.status}
                  onValueChange={(v) => {
                    // Same reasoning as the spreadsheet's inline status cell: don't let
                    // completedDate silently default to "right now" — ask for the real date.
                    if (v === "COMPLETED" && task.status !== "COMPLETED") {
                      setCompleteOpen(true);
                      return;
                    }
                    updateMutation.mutate({ id: task.id, input: { status: v as TaskRow["status"] } });
                  }}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>Progress</Label>
                  <span className="text-sm text-muted-foreground">{progressValue}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={progressValue} className="h-2 flex-1" />
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={progressValue}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    onBlur={() => {
                      if (progress !== null && progress !== task.progressPercent) {
                        updateMutation.mutate({ id: task.id, input: { progressPercent: progress } });
                      }
                    }}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label>Remarks</Label>
                <Textarea
                  rows={3}
                  value={remarksValue}
                  onChange={(e) => setRemarks(e.target.value)}
                  onBlur={() => {
                    if (remarks !== null && remarks !== (task.remarks ?? "")) {
                      updateMutation.mutate({ id: task.id, input: { remarks } });
                    }
                  }}
                  placeholder="Add notes about progress, blockers, etc."
                />
              </div>

              <div className="flex flex-col gap-1.5 sm:w-64">
                <Label htmlFor="completedDate">Completion date</Label>
                <Input
                  id="completedDate"
                  // Forces the uncontrolled input to remount (re-reading defaultValue) whenever
                  // the server value changes — otherwise confirming the Mark Completed dialog
                  // above would update the real completedDate but leave this field showing stale.
                  key={task.completedDate ?? "none"}
                  type="date"
                  defaultValue={toDateInputValue(task.completedDate)}
                  onChange={(e) =>
                    updateMutation.mutate({
                      id: task.id,
                      input: { completedDate: e.target.value ? new Date(e.target.value) : null },
                    })
                  }
                />
              </div>

              {updateMutation.isPending && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Saving...
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskTimeline history={history} />
          </CardContent>
        </Card>
      </div>

      <CompleteTaskDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        loading={updateMutation.isPending}
        onConfirm={(completedDate) =>
          updateMutation.mutate(
            { id: task.id, input: { status: "COMPLETED", completedDate } },
            { onSuccess: () => setCompleteOpen(false) },
          )
        }
      />

      {role === "ADMIN" && (
        <>
          <TaskFormDialog open={editOpen} onOpenChange={setEditOpen} task={task} />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Delete ${task.taskNumber}?`}
            description="This moves the task to the deleted list."
            confirmLabel="Delete"
            loading={deleteMutation.isPending}
            onConfirm={async () => {
              await deleteMutation.mutateAsync(task.id);
              router.push("/tasks");
            }}
          />
        </>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}
