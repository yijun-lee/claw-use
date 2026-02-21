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
// Environment helpers
// ---------------------------------------------------------------------------

function getAgentId(): string {
  return process.env.OPENCLAW_AGENT_ID || "main";
}

// ---------------------------------------------------------------------------
// Session → Task mapping
// ---------------------------------------------------------------------------

const ACTIVE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes
const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function inferStatus(session: OpenClawSession): TaskStatus {
  const age = Date.now() - session.updatedAt;

  if (age < ACTIVE_THRESHOLD_MS) return "in-progress";
  if (age < STALE_THRESHOLD_MS) return "todo";
  return "done";
}

function mapSessionToTask(session: OpenClawSession): Task {
  const ts = new Date(session.updatedAt).toISOString();
  return {
    id: session.key,
    title: session.displayName || session.label || session.key,
    description: session.label || "",
    status: inferStatus(session),
    priority: "medium",
    assignee: session.channel || "unassigned",
    createdAt: ts,
    updatedAt: ts,
    feedback: [],
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface GatewayOverrides {
  gatewayUrl: string;
  gatewayToken?: string;
}

const STATUS_ORDER: TaskStatus[] = ["heartbeat", "backlog", "todo", "in-progress", "done"];

export class OpenClawClient {
  // --- Gateway HTTP helpers ------------------------------------------------

  private async invokeGatewayTool(
    overrides: GatewayOverrides,
    tool: string,
    args?: Record<string, unknown>,
  ): Promise<ToolInvokeResponse> {
    const url = `${overrides.gatewayUrl}/tools/invoke`;
    const body: Record<string, unknown> = { tool };
    if (args) body.args = args;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (overrides.gatewayToken) headers.Authorization = `Bearer ${overrides.gatewayToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      await this.handleHttpError(res);
    }

    return (await res.json()) as ToolInvokeResponse;
  }

  private async sendHookAgent(
    overrides: GatewayOverrides,
    message: string,
    opts?: { agentId?: string },
  ): Promise<HookAgentResponse> {
    const url = `${overrides.gatewayUrl}/hooks/agent`;
    const agentId = opts?.agentId || getAgentId();

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (overrides.gatewayToken) headers.Authorization = `Bearer ${overrides.gatewayToken}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
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

  private async fetchSessions(overrides: GatewayOverrides): Promise<OpenClawSession[]> {
    const response = await this.invokeGatewayTool(overrides, "sessions_list");
    if (!response.ok || !response.result) {
      throw new OpenClawApiError(
        502,
        "GATEWAY_ERROR",
        response.error?.message || "sessions_list returned an error",
      );
    }
    // Gateway returns { content: [...], details: { sessions: [...] } }
    const result = response.result as Record<string, unknown>;
    const details = result.details as Record<string, unknown> | undefined;
    const sessions = details?.sessions as OpenClawSession[] | undefined;
    return sessions || [];
  }

  // --- Public API ----------------------------------------------------------

  async getDashboard(overrides: GatewayOverrides, filter?: string): Promise<DashboardData> {
    const sessions = await this.fetchSessions(overrides);
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

  async getMetrics(overrides: GatewayOverrides): Promise<MetricsSummary> {
    const sessions = await this.fetchSessions(overrides);
    const mappedTasks = sessions.map(mapSessionToTask);
    return this.computeMetrics(sessions, mappedTasks);
  }

  async createTask(overrides: GatewayOverrides, input: TaskCreateInput): Promise<Task> {
    const parts = [`Create task: ${input.title}`];
    if (input.description) parts.push(`Description: ${input.description}`);
    if (input.priority) parts.push(`Priority: ${input.priority}`);
    if (input.assignee) parts.push(`Assignee: ${input.assignee}`);
    if (input.status) parts.push(`Status: ${input.status}`);

    await this.sendHookAgent(overrides, parts.join("\n"));

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

  async updateTask(overrides: GatewayOverrides, update: TaskUpdate): Promise<Task> {
    const parts = [`Update task ${update.taskId}:`];
    if (update.status) parts.push(`Status → ${update.status}`);
    if (update.title) parts.push(`Title → ${update.title}`);
    if (update.description) parts.push(`Description → ${update.description}`);
    if (update.assignee) parts.push(`Assignee → ${update.assignee}`);
    if (update.priority) parts.push(`Priority → ${update.priority}`);
    if (update.feedback) parts.push(`Feedback: ${update.feedback}`);

    await this.sendHookAgent(overrides, parts.join("\n"));

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

  // --- Status navigation ---------------------------------------------------

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
    _sessions: OpenClawSession[],
    mappedTasks: Task[],
  ): MetricsSummary {
    const total = mappedTasks.length;
    const completed = mappedTasks.filter((t) => t.status === "done").length;

    return {
      totalTokens: 0,
      estimatedCostUSD: 0,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgResponseTimeMs: 0,
      totalTasks: total,
      completedTasks: completed,
    };
  }
}
