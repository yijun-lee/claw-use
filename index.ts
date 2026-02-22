import { MCPServer, object, text, widget } from "mcp-use/server";
import { z } from "zod";
import { OpenClawClient } from "./lib/openclaw-client.js";
import type { GatewayOverrides } from "./lib/openclaw-client.js";

const client = new OpenClawClient();
const baseUrl = process.env.MCP_URL || "http://localhost:3000";

// In-memory connection store — each user enters their own credentials via setup screen
let currentConnection: GatewayOverrides | null = null;

function getConnection(): GatewayOverrides | null {
  return currentConnection;
}

const server = new MCPServer({
  name: "claw-use",
  title: "OpenClaw Dashboard",
  version: "1.0.0",
  description: "OpenClaw agent task dashboard — manage tasks, monitor metrics, and control agent workflows",
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
// Tool 1: get-dashboard — renders the dashboard widget (or setup screen)
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-dashboard",
    description: "Display the OpenClaw task dashboard with a kanban board and metrics summary.",
    schema: z.object({
      filter: z
        .enum(["all", "heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("Filter tasks by a specific status"),
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
        props: {
          screen: "setup" as const,
        },
        output: text("Please configure your OpenClaw Gateway URL to get started."),
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
          `Dashboard loaded (${tasks.length} tasks)`,
          `Heartbeat: ${byStatus("heartbeat")} | Backlog: ${byStatus("backlog")} | To-Do: ${byStatus("todo")} | In Progress: ${byStatus("in-progress")} | Done: ${byStatus("done")}`,
          `Tokens: ${metrics.totalTokens.toLocaleString()} ($${metrics.estimatedCostUSD.toFixed(2)}) | Success: ${metrics.successRate}% | Avg Response: ${metrics.avgResponseTimeMs}ms`,
        ].join("\n")
      ),
    });
  }
);

// ---------------------------------------------------------------------------
// Tool 2: connect-openclaw — save gateway URL in memory and return dashboard
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "connect-openclaw",
    description: "Save the OpenClaw Gateway connection settings and load the dashboard.",
    schema: z.object({
      gatewayUrl: z.string().url().describe("OpenClaw Gateway URL"),
      gatewayToken: z.string().optional().describe("Optional auth token for the gateway"),
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
// Tool 3: update-task — backend tool for modifying tasks
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "update-task",
    description: "Update a task's status, title, description, assignee, priority, or add feedback.",
    schema: z.object({
      taskId: z.string().describe("ID of the task to update"),
      status: z
        .enum(["heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("New status"),
      title: z.string().optional().describe("New title"),
      description: z.string().optional().describe("New description"),
      feedback: z.string().optional().describe("Feedback message to add"),
      assignee: z.string().optional().describe("New assignee"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("New priority"),
    }),
  },
  async (params) => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const updated = await client.updateTask(conn, params);
    return object({
      success: true,
      task: updated,
    });
  }
);

// ---------------------------------------------------------------------------
// Tool 4: create-task — backend tool for creating new tasks
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "create-task",
    description: "Create a new task.",
    schema: z.object({
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      status: z
        .enum(["heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("Initial status (default: backlog)"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("Priority (default: medium)"),
      assignee: z.string().optional().describe("Assignee"),
    }),
  },
  async (params) => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const created = await client.createTask(conn, params);
    return object({
      success: true,
      task: created,
    });
  }
);

// ---------------------------------------------------------------------------
// Tool 5: get-metrics — backend tool for metrics analysis
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-metrics",
    description: "Retrieve agent performance metrics including token usage, success rate, and response time.",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const metrics = await client.getMetrics(conn);
    return object({ ...metrics });
  }
);

// ---------------------------------------------------------------------------
// Tool 6: refresh-dashboard — widget-callable refresh
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "refresh-dashboard",
    description: "Refresh dashboard data. Called from the widget.",
    schema: z.object({
      filter: z
        .enum(["all", "heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("Filter status"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const data = await client.getDashboard(conn, filter);
    return object({
      tasks: data.tasks,
      metrics: data.metrics,
      lastUpdated: data.lastUpdated,
    });
  }
);

// ---------------------------------------------------------------------------
// Tool 7: send-message — send a message to an OpenClaw session and get reply
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "send-message",
    description:
      "Send a message to an OpenClaw agent session and receive the agent's reply. " +
      "Use this to give instructions, ask questions, or trigger actions on a running agent. " +
      "Provide a sessionKey (e.g. 'agent:main:main') to target a specific session.",
    schema: z.object({
      sessionKey: z.string().describe("Session key to send the message to (e.g. 'agent:main:main')"),
      message: z.string().describe("The message to send to the agent"),
    }),
  },
  async ({ sessionKey, message }) => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const result = await client.sendMessage(conn, sessionKey, message);
    return object(result);
  }
);

// ---------------------------------------------------------------------------
// Tool 8: list-sessions — quick list of available sessions for reference
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "list-sessions",
    description:
      "List all active OpenClaw sessions with their keys, channels, and token usage. " +
      "Use this to find session keys before sending messages.",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const sessions = await client.listSessions(conn);
    return object({ sessions });
  }
);

// ---------------------------------------------------------------------------
// Tool 9: get-session-history — get conversation history for a session
// ---------------------------------------------------------------------------

server.tool(
  {
    name: "get-session-history",
    description:
      "Get the conversation history of a specific OpenClaw session. " +
      "Returns the last N messages (default 10) for context.",
    schema: z.object({
      sessionKey: z.string().describe("Session key (e.g. 'agent:main:main')"),
      limit: z.number().optional().describe("Number of recent messages to return (default 10)"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ sessionKey, limit }) => {
    const conn = getConnection();
    if (!conn) {
      return text("Gateway not configured. Please use connect-openclaw first.");
    }
    const history = await client.getSessionHistory(conn, sessionKey, limit ?? 10);
    return object(history);
  }
);

server.listen().then(() => {
  console.log("OpenClaw Dashboard server running");
});
