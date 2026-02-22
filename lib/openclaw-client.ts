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
const RECENT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

function inferStatus(session: OpenClawSession): TaskStatus {
  // Heartbeat sessions
  if (session.deliveryContext?.to === "heartbeat") return "heartbeat";

  // Cron / scheduled jobs
  if (session.label?.startsWith("Cron:") || (session.channel === "unknown" && session.label)) {
    return "backlog"; // "Scheduled"
  }

  const age = Date.now() - session.updatedAt;

  // Active: updated in last 10 minutes
  if (age < ACTIVE_THRESHOLD_MS) return "in-progress"; // "Active"

  // Chat: discord/webchat sessions still recent
  if (age < RECENT_THRESHOLD_MS) return "todo"; // "Chat"

  // Idle: old sessions
  return "done"; // "Idle"
}

function mapSessionToTask(session: OpenClawSession): Task {
  const ts = new Date(session.updatedAt).toISOString();
  const tokens = session.totalTokens || 0;
  const model = session.model || "";
  const contextTokens = session.contextTokens || 0;
  const contextPercent = contextTokens > 0 ? Math.round((tokens / contextTokens) * 100) : 0;

  // Build a readable description
  const parts: string[] = [];
  if (session.label) parts.push(session.label);
  if (model) parts.push(model);
  if (tokens > 0) {
    const tokenStr = tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : `${tokens}`;
    parts.push(`${tokenStr} tokens`);
  }
  if (contextPercent > 0) parts.push(`${contextPercent}% ctx`);

  // Determine channel label
  const channel = session.channel || "unknown";

  return {
    id: session.key,
    title: session.displayName || session.label || session.key,
    description: parts.join(" · "),
    status: inferStatus(session),
    priority: "medium",
    assignee: channel,
    createdAt: ts,
    updatedAt: ts,
    feedback: [],
    tokens,
    model,
    contextPercent,
  };
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export interface GatewayOverrides {
  gatewayUrl: string;
  gatewayToken?: string;
}

const STATUS_ORDER: TaskStatus[] = ["in-progress", "heartbeat", "backlog", "todo", "done"];

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

  private async fetchSessionSummary(
    overrides: GatewayOverrides,
    sessionKey: string,
  ): Promise<{ lastMessage: string; messageCount: number }> {
    try {
      const response = await this.invokeGatewayTool(overrides, "sessions_history", { sessionKey });
      if (!response.ok || !response.result) return { lastMessage: "", messageCount: 0 };

      const result = response.result as Record<string, unknown>;
      const content = result.content as Array<{ type: string; text: string }> | undefined;
      if (!content?.[0]?.text) return { lastMessage: "", messageCount: 0 };

      const parsed = JSON.parse(content[0].text) as {
        messages: Array<{ role: string; content: unknown }>;
      };
      const msgs = parsed.messages || [];

      // Find the last meaningful user message (skip heartbeat prompts)
      let lastMsg = "";
      for (let i = msgs.length - 1; i >= 0; i--) {
        const m = msgs[i];
        if (m.role !== "user") continue;
        let text = "";
        if (typeof m.content === "string") {
          text = m.content;
        } else if (Array.isArray(m.content)) {
          text = (m.content as Array<{ text?: string }>)[0]?.text || "";
        }
        // Skip generic heartbeat prompts
        if (text.startsWith("Read HEARTBEAT.md")) continue;
        lastMsg = text.slice(0, 120);
        break;
      }

      return { lastMessage: lastMsg, messageCount: msgs.length };
    } catch {
      return { lastMessage: "", messageCount: 0 };
    }
  }

  // --- Public API ----------------------------------------------------------

  async getDashboard(overrides: GatewayOverrides, filter?: string): Promise<DashboardData> {
    const sessions = await this.fetchSessions(overrides);
    let mappedTasks = sessions.map(mapSessionToTask);

    // Fetch session summaries in parallel
    const summaries = await Promise.all(
      sessions.map((s) => this.fetchSessionSummary(overrides, s.key))
    );
    for (let i = 0; i < mappedTasks.length; i++) {
      mappedTasks[i].lastMessage = summaries[i].lastMessage;
      mappedTasks[i].messageCount = summaries[i].messageCount;
    }

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

  // --- Interactive: send messages, list sessions, get history ---------------

  async sendMessage(
    overrides: GatewayOverrides,
    sessionKey: string,
    message: string,
  ): Promise<Record<string, unknown>> {
    const response = await this.invokeGatewayTool(overrides, "sessions_send", {
      sessionKey,
      message,
    });
    if (!response.ok) {
      throw new OpenClawApiError(
        502,
        "GATEWAY_ERROR",
        response.error?.message || "sessions_send failed",
      );
    }
    const result = response.result as Record<string, unknown>;
    const details = (result.details || {}) as Record<string, unknown>;
    return {
      status: details.status,
      reply: details.reply || null,
      sessionKey: details.sessionKey,
      runId: details.runId,
    };
  }

  async listSessions(
    overrides: GatewayOverrides,
  ): Promise<Array<{ key: string; channel: string; model: string; tokens: number; updatedAt: string }>> {
    const sessions = await this.fetchSessions(overrides);
    return sessions.map((s) => ({
      key: s.key,
      channel: s.channel || "unknown",
      model: s.model || "unknown",
      tokens: s.totalTokens || 0,
      updatedAt: new Date(s.updatedAt).toISOString(),
    }));
  }

  async getSessionHistory(
    overrides: GatewayOverrides,
    sessionKey: string,
    limit: number,
  ): Promise<{ sessionKey: string; messages: Array<{ role: string; text: string; timestamp: string }> }> {
    const response = await this.invokeGatewayTool(overrides, "sessions_history", { sessionKey });
    if (!response.ok || !response.result) {
      throw new OpenClawApiError(502, "GATEWAY_ERROR", "sessions_history failed");
    }
    const result = response.result as Record<string, unknown>;
    const content = result.content as Array<{ type: string; text: string }> | undefined;
    if (!content?.[0]?.text) return { sessionKey, messages: [] };

    const parsed = JSON.parse(content[0].text) as {
      messages: Array<{ role: string; content: unknown; timestamp?: number; model?: string }>;
    };
    const msgs = (parsed.messages || []).slice(-limit).map((m) => {
      let text = "";
      if (typeof m.content === "string") {
        text = m.content;
      } else if (Array.isArray(m.content)) {
        text = (m.content as Array<{ text?: string }>).map((c) => c.text || "").join("\n");
      }
      return {
        role: m.role,
        text,
        timestamp: m.timestamp ? new Date(m.timestamp).toISOString() : "",
      };
    });
    return { sessionKey, messages: msgs };
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

    await this.sendMessage(overrides, "agent:main:main", parts.join("\n"));

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

    await this.sendMessage(overrides, "agent:main:main", parts.join("\n"));

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
    sessions: OpenClawSession[],
    mappedTasks: Task[],
  ): MetricsSummary {
    const total = mappedTasks.length;
    const completed = mappedTasks.filter((t) => t.status === "done").length;

    // Sum actual token usage from all sessions
    const totalTokens = sessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
    const totalContext = sessions.reduce((sum, s) => sum + (s.contextTokens || 0), 0);

    // Estimate cost (Claude Opus blended ~$33/M tokens)
    const estimatedCostUSD = (totalTokens / 1_000_000) * 33;

    // Success rate: sessions not aborted
    const nonHeartbeat = sessions.filter((s) => s.deliveryContext?.to !== "heartbeat");
    const successCount = nonHeartbeat.filter((s) => !s.abortedLastRun).length;
    const successRate = nonHeartbeat.length > 0
      ? Math.round((successCount / nonHeartbeat.length) * 100)
      : 100;

    // Average session age
    const now = Date.now();
    const ages = sessions
      .filter((s) => s.updatedAt > 0)
      .map((s) => now - s.updatedAt);
    const avgResponseTimeMs = ages.length > 0
      ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length)
      : 0;

    // Context utilization: how much of the total context windows is used
    const contextUtilization = totalContext > 0
      ? Math.round((totalTokens / totalContext) * 100)
      : 0;

    // Channel breakdown: tokens per channel
    const channelBreakdown: Record<string, number> = {};
    for (const s of sessions) {
      const ch = s.channel || "unknown";
      channelBreakdown[ch] = (channelBreakdown[ch] || 0) + (s.totalTokens || 0);
    }

    return {
      totalTokens,
      estimatedCostUSD,
      successRate,
      avgResponseTimeMs,
      totalTasks: total,
      completedTasks: completed,
      contextUtilization,
      channelBreakdown,
    };
  }
}
