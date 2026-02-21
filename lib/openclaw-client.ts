import type {
  DashboardData,
  MetricsSummary,
  Task,
  TaskCreateInput,
  TaskStatus,
  TaskUpdate,
} from "./types.js";

const MOCK_TASKS: Task[] = [
  // Heartbeat
  {
    id: "hb-1",
    title: "API Gateway Health",
    description: "Monitoring API gateway uptime and latency",
    status: "heartbeat",
    priority: "critical",
    assignee: "system",
    createdAt: "2026-02-21T08:00:00Z",
    updatedAt: "2026-02-21T09:30:00Z",
    feedback: [],
  },
  {
    id: "hb-2",
    title: "Token Budget Monitor",
    description: "Tracking token usage against daily budget limits",
    status: "heartbeat",
    priority: "high",
    assignee: "system",
    createdAt: "2026-02-21T08:00:00Z",
    updatedAt: "2026-02-21T09:28:00Z",
    feedback: [],
  },
  {
    id: "hb-3",
    title: "Agent Pool Status",
    description: "3/5 agents active, 2 idle",
    status: "heartbeat",
    priority: "medium",
    assignee: "system",
    createdAt: "2026-02-21T08:00:00Z",
    updatedAt: "2026-02-21T09:25:00Z",
    feedback: [],
  },
  // Backlog
  {
    id: "bl-1",
    title: "Implement OAuth2 flow",
    description: "Add OAuth2 authentication for production deployment",
    status: "backlog",
    priority: "high",
    assignee: "unassigned",
    createdAt: "2026-02-20T14:00:00Z",
    updatedAt: "2026-02-20T14:00:00Z",
    feedback: [
      {
        id: "fb-1",
        author: "PM",
        message: "Priority for next sprint",
        createdAt: "2026-02-20T15:00:00Z",
      },
    ],
  },
  {
    id: "bl-2",
    title: "Add rate limiting",
    description: "Implement rate limiting on all API endpoints",
    status: "backlog",
    priority: "medium",
    assignee: "unassigned",
    createdAt: "2026-02-19T10:00:00Z",
    updatedAt: "2026-02-19T10:00:00Z",
    feedback: [],
  },
  {
    id: "bl-3",
    title: "Dashboard export to PDF",
    description: "Allow users to export dashboard metrics as PDF reports",
    status: "backlog",
    priority: "low",
    assignee: "unassigned",
    createdAt: "2026-02-18T09:00:00Z",
    updatedAt: "2026-02-18T09:00:00Z",
    feedback: [],
  },
  // To-Do
  {
    id: "td-1",
    title: "Write integration tests",
    description: "Create test suite for all 5 MCP tools",
    status: "todo",
    priority: "high",
    assignee: "agent-02",
    createdAt: "2026-02-20T11:00:00Z",
    updatedAt: "2026-02-21T08:00:00Z",
    feedback: [],
  },
  {
    id: "td-2",
    title: "Setup CI/CD pipeline",
    description: "Configure GitHub Actions for auto-deploy on merge",
    status: "todo",
    priority: "medium",
    assignee: "agent-03",
    createdAt: "2026-02-20T12:00:00Z",
    updatedAt: "2026-02-20T12:00:00Z",
    feedback: [],
  },
  {
    id: "td-3",
    title: "Error boundary components",
    description: "Add React error boundaries to widget components",
    status: "todo",
    priority: "medium",
    assignee: "agent-01",
    createdAt: "2026-02-20T13:00:00Z",
    updatedAt: "2026-02-20T13:00:00Z",
    feedback: [],
  },
  // In Progress
  {
    id: "ip-1",
    title: "Kanban drag-and-drop",
    description: "Implement click-based task status transitions in the kanban board",
    status: "in-progress",
    priority: "high",
    assignee: "agent-01",
    createdAt: "2026-02-20T09:00:00Z",
    updatedAt: "2026-02-21T09:15:00Z",
    feedback: [
      {
        id: "fb-2",
        author: "reviewer",
        message: "Use arrow buttons instead of drag for iframe compatibility",
        createdAt: "2026-02-21T08:30:00Z",
      },
    ],
  },
  {
    id: "ip-2",
    title: "Metrics aggregation service",
    description: "Build service to aggregate token usage and success rates across agents",
    status: "in-progress",
    priority: "critical",
    assignee: "agent-02",
    createdAt: "2026-02-19T16:00:00Z",
    updatedAt: "2026-02-21T09:00:00Z",
    feedback: [],
  },
  {
    id: "ip-3",
    title: "Dark mode theme support",
    description: "Ensure all components respect useWidgetTheme for light/dark mode",
    status: "in-progress",
    priority: "medium",
    assignee: "agent-03",
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-02-21T08:45:00Z",
    feedback: [],
  },
  // Done
  {
    id: "dn-1",
    title: "MCP server scaffold",
    description: "Initial MCP server setup with mcp-use framework",
    status: "done",
    priority: "high",
    assignee: "agent-01",
    createdAt: "2026-02-18T08:00:00Z",
    updatedAt: "2026-02-19T17:00:00Z",
    feedback: [],
  },
  {
    id: "dn-2",
    title: "Mock data layer",
    description: "Create comprehensive mock data for development",
    status: "done",
    priority: "medium",
    assignee: "agent-02",
    createdAt: "2026-02-18T10:00:00Z",
    updatedAt: "2026-02-20T11:00:00Z",
    feedback: [],
  },
  {
    id: "dn-3",
    title: "Widget type definitions",
    description: "Define TypeScript types for all widget props and state",
    status: "done",
    priority: "medium",
    assignee: "agent-01",
    createdAt: "2026-02-18T11:00:00Z",
    updatedAt: "2026-02-20T14:00:00Z",
    feedback: [
      {
        id: "fb-3",
        author: "reviewer",
        message: "LGTM, types are comprehensive",
        createdAt: "2026-02-20T15:00:00Z",
      },
    ],
  },
];

const MOCK_METRICS: MetricsSummary = {
  totalTokens: 152847,
  estimatedCostUSD: 3.42,
  successRate: 87,
  avgResponseTimeMs: 1300,
  totalTasks: 15,
  completedTasks: 3,
};

let tasks = [...MOCK_TASKS];

const STATUS_ORDER: TaskStatus[] = ["heartbeat", "backlog", "todo", "in-progress", "done"];

function isMock(): boolean {
  return process.env.OPENCLAW_MOCK !== "false";
}

function getApiUrl(): string {
  return process.env.OPENCLAW_API_URL || "https://api.openclaw.io";
}

function getAuthHeaders(): Record<string, string> {
  const token = process.env.OPENCLAW_AUTH_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class OpenClawClient {
  async getDashboard(filter?: string): Promise<DashboardData> {
    if (isMock()) {
      const filtered = filter && filter !== "all"
        ? tasks.filter((t) => t.status === filter)
        : tasks;
      return {
        tasks: filtered,
        metrics: MOCK_METRICS,
        lastUpdated: new Date().toISOString(),
      };
    }

    const url = new URL("/api/stats", getApiUrl());
    if (filter && filter !== "all") url.searchParams.set("filter", filter);
    const res = await fetch(url.toString(), { headers: getAuthHeaders() });
    return res.json() as Promise<DashboardData>;
  }

  async getTasks(): Promise<Task[]> {
    if (isMock()) return tasks;

    const res = await fetch(new URL("/api/tasks", getApiUrl()).toString(), {
      headers: getAuthHeaders(),
    });
    return res.json() as Promise<Task[]>;
  }

  async getMetrics(): Promise<MetricsSummary> {
    if (isMock()) return MOCK_METRICS;

    const res = await fetch(new URL("/api/tokens", getApiUrl()).toString(), {
      headers: getAuthHeaders(),
    });
    return res.json() as Promise<MetricsSummary>;
  }

  async updateTask(update: TaskUpdate): Promise<Task> {
    if (isMock()) {
      const idx = tasks.findIndex((t) => t.id === update.taskId);
      if (idx === -1) throw new Error(`Task ${update.taskId} not found`);

      const task = { ...tasks[idx] };
      if (update.status) task.status = update.status;
      if (update.title) task.title = update.title;
      if (update.description) task.description = update.description;
      if (update.assignee) task.assignee = update.assignee;
      if (update.priority) task.priority = update.priority;
      if (update.feedback) {
        task.feedback = [
          ...task.feedback,
          {
            id: `fb-${Date.now()}`,
            author: "user",
            message: update.feedback,
            createdAt: new Date().toISOString(),
          },
        ];
      }
      task.updatedAt = new Date().toISOString();
      tasks[idx] = task;
      return task;
    }

    const res = await fetch(
      new URL(`/api/tasks/${update.taskId}`, getApiUrl()).toString(),
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(update),
      }
    );
    return res.json() as Promise<Task>;
  }

  async createTask(input: TaskCreateInput): Promise<Task> {
    if (isMock()) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        title: input.title,
        description: input.description || "",
        status: input.status || "backlog",
        priority: input.priority || "medium",
        assignee: input.assignee || "unassigned",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        feedback: [],
      };
      tasks.push(newTask);
      return newTask;
    }

    const res = await fetch(new URL("/api/tasks", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getAuthHeaders() },
      body: JSON.stringify(input),
    });
    return res.json() as Promise<Task>;
  }

  getNextStatus(current: TaskStatus): TaskStatus | null {
    const idx = STATUS_ORDER.indexOf(current);
    return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  }

  getPrevStatus(current: TaskStatus): TaskStatus | null {
    const idx = STATUS_ORDER.indexOf(current);
    return idx > 0 ? STATUS_ORDER[idx - 1] : null;
  }
}
