import { z } from "zod";

export const taskFeedbackSchema = z.object({
  id: z.string(),
  author: z.string(),
  message: z.string(),
  createdAt: z.string(),
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(["heartbeat", "backlog", "todo", "in-progress", "done"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  assignee: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  feedback: z.array(taskFeedbackSchema),
});

export const metricsSchema = z.object({
  totalTokens: z.number(),
  estimatedCostUSD: z.number(),
  successRate: z.number(),
  avgResponseTimeMs: z.number(),
  totalTasks: z.number(),
  completedTasks: z.number(),
});

export const propSchema = z.object({
  screen: z.enum(["setup", "dashboard"]).default("dashboard"),
  tasks: z.array(taskSchema).optional(),
  metrics: metricsSchema.optional(),
  lastUpdated: z.string().optional(),
  activeFilter: z.string().optional(),
});

export type DashboardProps = z.infer<typeof propSchema>;
export type TaskItem = z.infer<typeof taskSchema>;
export type MetricsData = z.infer<typeof metricsSchema>;
export type TaskFeedbackItem = z.infer<typeof taskFeedbackSchema>;

export type TaskStatus = "heartbeat" | "backlog" | "todo" | "in-progress" | "done";

export interface ColumnConfig {
  id: TaskStatus;
  label: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
}

export const COLUMNS: ColumnConfig[] = [
  {
    id: "heartbeat",
    label: "Heartbeat",
    bgClass: "bg-purple-500/10",
    borderClass: "border-purple-500/30",
    dotClass: "bg-purple-500",
  },
  {
    id: "backlog",
    label: "Backlog",
    bgClass: "bg-gray-500/10",
    borderClass: "border-gray-500/30",
    dotClass: "bg-gray-500",
  },
  {
    id: "todo",
    label: "To-Do",
    bgClass: "bg-blue-500/10",
    borderClass: "border-blue-500/30",
    dotClass: "bg-blue-500",
  },
  {
    id: "in-progress",
    label: "In Progress",
    bgClass: "bg-amber-500/10",
    borderClass: "border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  {
    id: "done",
    label: "Done",
    bgClass: "bg-emerald-500/10",
    borderClass: "border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
];

export const STATUS_ORDER: TaskStatus[] = ["heartbeat", "backlog", "todo", "in-progress", "done"];
