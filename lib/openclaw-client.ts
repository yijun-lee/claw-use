import type {
  DashboardData,
  HookAgentResponse,
  MetricsSummary,
  OpenClawSession,
  Task,
  TaskCreateInput,
  TaskStatus,
  TaskUpdate,
  ToolInvokeResponse,
} from "./types.js";
import { OpenClawApiError } from "./types.js";

// ---------------------------------------------------------------------------
// Mock data (used when OPENCLAW_MOCK !== "false")
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function isMock(): boolean {
  return process.env.OPENCLAW_MOCK !== "false";
}

function getGatewayUrl(): string {
  return process.env.OPENCLAW_GATEWAY_URL || "http://127.0.0.1:18789";
}

function getGatewayToken(): string | undefined {
  return process.env.OPENCLAW_GATEWAY_TOKEN;
}

function getAgentId(): string {
  return process.env.OPENCLAW_AGENT_ID || "main";
}

function getAuthHeaders(): Record<string, string> {
  const token = getGatewayToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Session → Task mapping
// ---------------------------------------------------------------------------

const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function inferStatus(session: OpenClawSession): TaskStatus {
  const updatedAt = new Date(session.updatedAt).getTime();
  const age = Date.now() - updatedAt;

  if (age < ACTIVE_THRESHOLD_MS) return "in-progress";
  if (age < STALE_THRESHOLD_MS) return "todo";
  return "done";
}

function mapSessionToTask(session: OpenClawSession): Task {
  return {
    id: session.sessionKey,
    title: session.displayName || session.subject || session.sessionKey,
    description: session.subject || "",
    status: inferStatus(session),
    priority: "medium",
    assignee: session.channel || "unassigned",
    createdAt: session.updatedAt, // sessions_list doesn't expose createdAt
    updatedAt: session.updatedAt,
    feedback: [],
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class OpenClawClient {
  // --- Gateway HTTP helpers ------------------------------------------------

  private async invokeGatewayTool(
    tool: string,
    args?: Record<string, unknown>,
  ): Promise<ToolInvokeResponse> {
    const url = `${getGatewayUrl()}/tools/invoke`;
    const body: Record<string, unknown> = { tool };
    if (args) body.args = args;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      await this.handleHttpError(res);
    }

    return (await res.json()) as ToolInvokeResponse;
  }

  private async sendHookAgent(
    message: string,
    opts?: { agentId?: string },
  ): Promise<HookAgentResponse> {
    const url = `${getGatewayUrl()}/hooks/agent`;
    const agentId = opts?.agentId || getAgentId();

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ agentId, message }),
    });

    if (!res.ok) {
      await this.handleHttpError(res);
    }

    // 202 Accepted — may have no body
    if (res.status === 202 || res.headers.get("content-length") === "0") {
      return { ok: true };
    }

    return (await res.json()) as HookAgentResponse;
  }

  private async handleHttpError(res: Response): Promise<never> {
    // Rate limit — respect Retry-After
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      throw new OpenClawApiError(
        429,
        "RATE_LIMITED",
        `Rate limited. Retry after ${retryAfter ?? "unknown"} seconds.`,
      );
    }

    let errorBody = "";
    try {
      errorBody = await res.text();
    } catch {
      // ignore read errors
    }

    const codeMap: Record<number, string> = {
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      500: "INTERNAL_ERROR",
    };

    throw new OpenClawApiError(
      res.status,
      codeMap[res.status] || "HTTP_ERROR",
      `Gateway responded with ${res.status}: ${errorBody || res.statusText}`,
    );
  }

  // --- Fetching sessions from Gateway --------------------------------------

  private async fetchSessions(): Promise<OpenClawSession[]> {
    const response = await this.invokeGatewayTool("sessions_list");
    if (!response.ok || !response.result) {
      throw new OpenClawApiError(
        502,
        "GATEWAY_ERROR",
        response.error?.message || "sessions_list returned an error",
      );
    }
    return response.result as OpenClawSession[];
  }

  // --- Public API (same interface as before) --------------------------------

  async getDashboard(filter?: string): Promise<DashboardData> {
    if (isMock()) {
      const filtered =
        filter && filter !== "all"
          ? tasks.filter((t) => t.status === filter)
          : tasks;
      return {
        tasks: filtered,
        metrics: MOCK_METRICS,
        lastUpdated: new Date().toISOString(),
      };
    }

    const sessions = await this.fetchSessions();
    let mappedTasks = sessions.map(mapSessionToTask);

    if (filter && filter !== "all") {
      mappedTasks = mappedTasks.filter((t) => t.status === filter);
    }

    const metrics = this.computeMetrics(sessions, mappedTasks);

    return {
      tasks: mappedTasks,
      metrics,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getTasks(): Promise<Task[]> {
    if (isMock()) return tasks;

    const sessions = await this.fetchSessions();
    return sessions.map(mapSessionToTask);
  }

  async getMetrics(): Promise<MetricsSummary> {
    if (isMock()) return MOCK_METRICS;

    const sessions = await this.fetchSessions();
    const mappedTasks = sessions.map(mapSessionToTask);
    return this.computeMetrics(sessions, mappedTasks);
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

    const parts = [`Create task: ${input.title}`];
    if (input.description) parts.push(`Description: ${input.description}`);
    if (input.priority) parts.push(`Priority: ${input.priority}`);
    if (input.assignee) parts.push(`Assignee: ${input.assignee}`);
    if (input.status) parts.push(`Status: ${input.status}`);

    await this.sendHookAgent(parts.join("\n"));

    // Hook is async (202); return an optimistic task object
    return {
      id: `pending-${Date.now()}`,
      title: input.title,
      description: input.description || "",
      status: input.status || "backlog",
      priority: input.priority || "medium",
      assignee: input.assignee || "unassigned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: [],
    };
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

    const parts = [`Update task ${update.taskId}:`];
    if (update.status) parts.push(`Status → ${update.status}`);
    if (update.title) parts.push(`Title → ${update.title}`);
    if (update.description) parts.push(`Description → ${update.description}`);
    if (update.assignee) parts.push(`Assignee → ${update.assignee}`);
    if (update.priority) parts.push(`Priority → ${update.priority}`);
    if (update.feedback) parts.push(`Feedback: ${update.feedback}`);

    await this.sendHookAgent(parts.join("\n"));

    // Hook is async; return optimistic update
    return {
      id: update.taskId,
      title: update.title || update.taskId,
      description: update.description || "",
      status: update.status || "todo",
      priority: update.priority || "medium",
      assignee: update.assignee || "unassigned",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feedback: update.feedback
        ? [
            {
              id: `fb-${Date.now()}`,
              author: "user",
              message: update.feedback,
              createdAt: new Date().toISOString(),
            },
          ]
        : [],
    };
  }

  // --- Status navigation (unchanged) --------------------------------------

  getNextStatus(current: TaskStatus): TaskStatus | null {
    const idx = STATUS_ORDER.indexOf(current);
    return idx < STATUS_ORDER.length - 1 ? STATUS_ORDER[idx + 1] : null;
  }

  getPrevStatus(current: TaskStatus): TaskStatus | null {
    const idx = STATUS_ORDER.indexOf(current);
    return idx > 0 ? STATUS_ORDER[idx - 1] : null;
  }

  // --- Metrics aggregation -------------------------------------------------

  private computeMetrics(
    sessions: OpenClawSession[],
    mappedTasks: Task[],
  ): MetricsSummary {
    const total = mappedTasks.length;
    const completed = mappedTasks.filter((t) => t.status === "done").length;
    const active = mappedTasks.filter((t) => t.status === "in-progress").length;

    return {
      totalTokens: 0, // not available from sessions_list
      estimatedCostUSD: 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgResponseTimeMs: 0,
      totalTasks: total,
      completedTasks: completed,
    };
  }
}
