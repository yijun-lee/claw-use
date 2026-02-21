export type TaskStatus = "heartbeat" | "backlog" | "todo" | "in-progress" | "done";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface TaskFeedback {
  id: string;
  author: string;
  message: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  createdAt: string;
  updatedAt: string;
  feedback: TaskFeedback[];
}

export interface MetricsSummary {
  totalTokens: number;
  estimatedCostUSD: number;
  successRate: number;
  avgResponseTimeMs: number;
  totalTasks: number;
  completedTasks: number;
}

export interface DashboardData {
  tasks: Task[];
  metrics: MetricsSummary;
  lastUpdated: string;
}

export interface TaskUpdate {
  taskId: string;
  status?: TaskStatus;
  title?: string;
  description?: string;
  feedback?: string;
  assignee?: string;
  priority?: TaskPriority;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
}
