"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import { useChartColors } from "@/lib/chart-colors";
import { PRIORITY_META, type TaskPriority } from "@/lib/constants";

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number | string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-muted-foreground">
          {p.color && <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />}
          {p.name}: <span className="font-medium text-popover-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function CountByGroupChart({ data }: { data: { name: string; count: number }[] }) {
  const colors = useChartColors();
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }} barCategoryGap="24%">
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={{ stroke: colors.axis }} tickLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
        <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={<ChartTooltip />} />
        <Bar dataKey="count" name="Tasks" fill={colors.primary} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EmployeePerformanceChart({ data }: { data: { name: string; completionRate: number }[] }) {
  const colors = useChartColors();
  const sorted = [...data].sort((a, b) => b.completionRate - a.completionRate);
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barCategoryGap="20%">
        <CartesianGrid stroke={colors.grid} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
        <YAxis type="category" dataKey="name" tick={{ fill: colors.ink, fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={<ChartTooltip />} />
        <Bar dataKey="completionRate" name="Completion %" fill={colors.primary} radius={[0, 4, 4, 0]} maxBarSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PriorityDistributionChart({ data }: { data: { priority: TaskPriority; count: number }[] }) {
  const colors = useChartColors();
  const priorityColor: Record<TaskPriority, string> = {
    P1_URGENT: colors.critical,
    P2_MEDIUM: colors.warning,
    P3_LOW: colors.good,
  };
  const chartData = data.map((d) => ({ name: PRIORITY_META[d.priority].label, count: d.count, priority: d.priority }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid stroke={colors.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={{ fill: colors.ink, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
        <Tooltip cursor={{ fill: colors.grid, opacity: 0.4 }} content={<ChartTooltip />} />
        <Bar dataKey="count" name="Tasks" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {chartData.map((entry) => (
            <Cell key={entry.priority} fill={priorityColor[entry.priority]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data, dataKey, name, tone }: { data: { period: string; value: number }[]; dataKey?: string; name: string; tone: "good" | "critical" }) {
  const colors = useChartColors();
  const stroke = tone === "good" ? colors.good : colors.critical;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="period" tick={{ fill: colors.muted, fontSize: 11 }} axisLine={{ stroke: colors.axis }} tickLine={false} />
        <YAxis tick={{ fill: colors.muted, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey={dataKey ?? "value"}
          name={name}
          stroke={stroke}
          strokeWidth={2}
          dot={{ r: 4, fill: stroke, stroke: "var(--card)", strokeWidth: 2 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
