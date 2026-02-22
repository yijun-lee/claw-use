import { MCPServer, object, text, widget } from "mcp-use/server";
import { z } from "zod";
import { OpenClawClient } from "./lib/openclaw-client.js";
import type { GatewayOverrides } from "./lib/openclaw-client.js";

const client = new OpenClawClient();
const baseUrl = process.env.MCP_URL || "http://localhost:3000";

// In-memory connection store
let currentConnection: GatewayOverrides | null = null;

function getConnection(): GatewayOverrides | null {
  return currentConnection;
}

const NOT_CONNECTED =
  "Not connected to an OpenClaw gateway. " +
  "Ask the user for their Gateway URL (and optional auth token), " +
  "then call connect-openclaw with those values.";

const server = new MCPServer({
  name: "claw-use",
  title: "OpenClaw Dashboard",
  version: "1.0.0",
  description:
    "OpenClaw command center — monitor AI agent sessions, view token usage and metrics, " +
    "send messages to agents, and browse conversation history. " +
    "IMPORTANT: The user must first connect to their OpenClaw gateway by providing a Gateway URL " +
    "and optional auth token. Call connect-openclaw before using any other tool. " +
    "After connecting, use get-dashboard to show the visual dashboard. " +
    "CRITICAL RULE: After ANY action tool (send-message, create-task, update-task), " +
    "you MUST immediately call get-dashboard to refresh and display the updated dashboard widget. " +
    "Other tools: list-sessions to see available sessions, send-message to interact with agents, " +
    "get-session-history to review conversations.",
  baseUrl,
  favicon: "favicon.ico",
  websiteUrl: "https://openclaw.io",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// ---------------------------------------------------------------------------
// connect-openclaw — MUST be called first
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "connect-openclaw",
    description:
      "Connect to an OpenClaw gateway. This MUST be called before any other tool. " +
      "Ask the user for their Gateway URL and optional auth token. " +
      "On success, returns the full dashboard data (sessions, metrics).",
    schema: z.object({
      gatewayUrl: z
        .string()
        .url()
        .describe("The OpenClaw Gateway URL (e.g. https://my-gateway.trycloudflare.com)"),
      gatewayToken: z
        .string()
        .optional()
        .describe("Bearer token for authenticated gateways. Ask the user if their gateway requires one."),
    }),
  },
  async ({ gatewayUrl, gatewayToken }) => {
    currentConnection = { gatewayUrl, gatewayToken };

    const data = await client.getDashboard(currentConnection);

    return object({
      success: true,
      tasks: data.tasks,
      metrics: data.metrics,
      lastUpdated: data.lastUpdated,
    });
  }
);

// ---------------------------------------------------------------------------
// get-dashboard — visual dashboard widget
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-dashboard",
    description:
      "Show the OpenClaw monitoring dashboard as a visual widget. " +
      "Displays all agent sessions grouped by status (Active, Heartbeat, Scheduled, Chat, Idle), " +
      "token usage metrics, context utilization, success rate, and channel breakdown. " +
      "Each session shows its last message preview and message count. " +
      "If not connected, instructs the user to provide their gateway credentials.",
    schema: z.object({
      filter: z
        .enum(["all", "heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe(
          "Filter sessions by category: " +
          "'in-progress' = Active (recent activity), " +
          "'heartbeat' = Heartbeat sessions, " +
          "'backlog' = Scheduled/Cron jobs, " +
          "'todo' = Chat (Discord/Webchat), " +
          "'done' = Idle sessions"
        ),
    }),
    widget: {
      name: "dashboard",
      invoking: "Loading dashboard...",
      invoked: "Dashboard ready",
    },
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const conn = getConnection();
    if (!conn) {
      return widget({
        props: { screen: "setup" as const },
        output: text(NOT_CONNECTED),
      });
    }

    const data = await client.getDashboard(conn, filter);
    const { metrics, tasks } = data;

    const byStatus = (s: string) => tasks.filter((t) => t.status === s).length;

    return widget({
      props: {
        screen: "dashboard" as const,
        tasks,
        metrics,
        lastUpdated: data.lastUpdated,
        activeFilter: filter ?? "all",
      },
      output: text(
        [
          `Dashboard loaded — ${tasks.length} sessions across ${new Set(tasks.map((t) => t.assignee)).size} channels`,
          `Active: ${byStatus("in-progress")} | Heartbeat: ${byStatus("heartbeat")} | Scheduled: ${byStatus("backlog")} | Chat: ${byStatus("todo")} | Idle: ${byStatus("done")}`,
          `Total tokens: ${metrics.totalTokens.toLocaleString()} (~$${metrics.estimatedCostUSD.toFixed(2)}) | Success: ${metrics.successRate}% | Context: ${metrics.contextUtilization ?? 0}%`,
          "",
          "Sessions:",
          ...tasks.map((t) =>
            `  [${t.status}] ${t.title} — ${t.description} (${t.assignee}, ${t.updatedAt})`
          ),
        ].join("\n")
      ),
    });
  }
);

// ---------------------------------------------------------------------------
// send-message — interact with an agent session
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "send-message",
    description:
      "Send a message to a specific OpenClaw agent session and receive the agent's reply. " +
      "Use this to give instructions, ask questions, or trigger actions. " +
      "You need the session key — call list-sessions first to find available session keys. " +
      "Common session keys: 'agent:main:main' for the main webchat agent. " +
      "The agent will process the message and return a reply. " +
      "IMPORTANT: After this tool completes, you MUST call get-dashboard to refresh and display the updated visual dashboard widget.",
    schema: z.object({
      sessionKey: z
        .string()
        .describe(
          "Session key identifying which agent session to message. " +
          "Format: 'agent:main:<session-id>'. Use list-sessions to find valid keys."
        ),
      message: z
        .string()
        .describe("The message to send. Can be a question, instruction, or task for the agent."),
    }),
  },
  async ({ sessionKey, message }) => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const result = await client.sendMessage(conn, sessionKey, message);
    return object(result);
  }
);

// ---------------------------------------------------------------------------
// list-sessions — discover available sessions
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "list-sessions",
    description:
      "List all active OpenClaw agent sessions with their keys, channels, models, and token usage. " +
      "Use this to discover which sessions are available before sending messages. " +
      "Each session has a unique key (e.g. 'agent:main:main') that you pass to send-message.",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const sessions = await client.listSessions(conn);
    return object({ sessions });
  }
);

// ---------------------------------------------------------------------------
// get-session-history — view conversation in a session
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-session-history",
    description:
      "Retrieve the recent conversation history of a specific OpenClaw session. " +
      "Shows the last N messages (default 10) with role, content, and timestamps. " +
      "Useful for understanding what an agent has been doing or reviewing past interactions.",
    schema: z.object({
      sessionKey: z
        .string()
        .describe("Session key (e.g. 'agent:main:main'). Use list-sessions to find keys."),
      limit: z
        .number()
        .optional()
        .describe("Number of recent messages to return. Default: 10, max recommended: 20."),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ sessionKey, limit }) => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const history = await client.getSessionHistory(conn, sessionKey, limit ?? 10);
    return object(history);
  }
);

// ---------------------------------------------------------------------------
// get-metrics — detailed metrics
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-metrics",
    description:
      "Get detailed performance metrics: total token usage with estimated cost, " +
      "context window utilization percentage, success rate, session count, " +
      "and per-channel token breakdown (discord, webchat, etc.).",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const metrics = await client.getMetrics(conn);
    return object({ ...metrics });
  }
);

// ---------------------------------------------------------------------------
// refresh-dashboard — widget-internal refresh
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "refresh-dashboard",
    description: "Refresh the dashboard widget data. Called internally by the widget UI.",
    schema: z.object({
      filter: z
        .enum(["all", "heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("Filter by session category"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const data = await client.getDashboard(conn, filter);
    return object({
      tasks: data.tasks,
      metrics: data.metrics,
      lastUpdated: data.lastUpdated,
    });
  }
);

// ---------------------------------------------------------------------------
// update-task — modify session metadata
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "update-task",
    description:
      "Send an update command to the OpenClaw agent for a specific session. " +
      "Can change status, add feedback, or update metadata. " +
      "IMPORTANT: After this tool completes, you MUST call get-dashboard to refresh and display the updated visual dashboard widget.",
    schema: z.object({
      taskId: z.string().describe("Session key / task ID to update"),
      status: z
        .enum(["heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("New status category"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      feedback: z.string().optional().describe("Feedback message to send to the agent"),
      assignee: z.string().optional().describe("New assignee/channel"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("New priority level"),
    }),
  },
  async (params) => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const updated = await client.updateTask(conn, params);
    return object({ success: true, task: updated });
  }
);

// ---------------------------------------------------------------------------
// create-task — create a new task via agent
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "create-task",
    description:
      "Create a new task by sending a creation message to the OpenClaw agent. " +
      "The agent will process and schedule the task. " +
      "IMPORTANT: After this tool completes, you MUST call get-dashboard to refresh and display the updated visual dashboard widget.",
    schema: z.object({
      title: z.string().describe("Task title — what needs to be done"),
      description: z.string().optional().describe("Detailed task description"),
      status: z
        .enum(["heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("Initial status (default: backlog/scheduled)"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("Task priority (default: medium)"),
      assignee: z.string().optional().describe("Assign to a specific channel/agent"),
    }),
  },
  async (params) => {
    const conn = getConnection();
    if (!conn) return text(NOT_CONNECTED);
    const created = await client.createTask(conn, params);
    return object({ success: true, task: created });
  }
);

server.listen().then(() => {
  console.log("OpenClaw Dashboard server running");
});
