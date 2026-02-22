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
  tokens?: number;
  model?: string;
  contextPercent?: number;
}

export interface MetricsSummary {
  totalTokens: number;
  estimatedCostUSD: number;
  successRate: number;
  avgResponseTimeMs: number;
  totalTasks: number;
  completedTasks: number;
  contextUtilization?: number;
  channelBreakdown?: Record<string, number>;
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

// --- OpenClaw Gateway raw response types ---

export interface OpenClawSession {
  sessionId: string;
  key: string;
  updatedAt: number;
  displayName?: string;
  channel?: string;
  label?: string;
  kind?: string;
  model?: string;
  totalTokens?: number;
  contextTokens?: number;
  systemSent?: boolean;
  abortedLastRun?: boolean;
  lastChannel?: string;
  deliveryContext?: { channel?: string; to?: string };
}

export interface ToolInvokeResponse {
  ok: boolean;
  result?: unknown;
  error?: { type: string; message: string };
}

export interface HookAgentResponse {
  // 202 Accepted — async, typically no body
  ok?: boolean;
}

export class OpenClawApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "OpenClawApiError";
  }
}
