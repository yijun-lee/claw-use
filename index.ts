import { MCPServer, object, text, widget } from "mcp-use/server";
import { z } from "zod";
import { OpenClawClient } from "./lib/openclaw-client.js";

const client = new OpenClawClient();

const server = new MCPServer({
  name: "claw-use",
  title: "OpenClaw Dashboard",
  version: "1.0.0",
  description: "OpenClaw agent task dashboard — manage tasks, monitor metrics, and control agent workflows",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
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

// Tool 1: get-dashboard — renders the dashboard widget
server.tool(
  {
    name: "get-dashboard",
    description: "OpenClaw 작업 대시보드를 표시합니다. 칸반 보드와 메트릭 요약을 포함합니다.",
    schema: z.object({
      filter: z
        .enum(["all", "heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("특정 상태의 작업만 필터링"),
    }),
    widget: {
      name: "dashboard",
      invoking: "Loading dashboard...",
      invoked: "Dashboard ready",
    },
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const data = await client.getDashboard(filter);
    const { metrics, tasks } = data;

    const byStatus = (s: string) => tasks.filter((t) => t.status === s).length;

    return widget({
      props: {
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

// Tool 2: update-task — backend tool for modifying tasks
server.tool(
  {
    name: "update-task",
    description: "작업의 상태, 제목, 설명, 담당자, 우선순위를 수정하거나 피드백을 추가합니다.",
    schema: z.object({
      taskId: z.string().describe("수정할 작업 ID"),
      status: z
        .enum(["heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("새로운 상태"),
      title: z.string().optional().describe("새로운 제목"),
      description: z.string().optional().describe("새로운 설명"),
      feedback: z.string().optional().describe("추가할 피드백 메시지"),
      assignee: z.string().optional().describe("새로운 담당자"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("새로운 우선순위"),
    }),
  },
  async (params) => {
    const updated = await client.updateTask(params);
    return object({
      success: true,
      task: updated,
    });
  }
);

// Tool 3: create-task — backend tool for creating new tasks
server.tool(
  {
    name: "create-task",
    description: "새로운 작업을 생성합니다.",
    schema: z.object({
      title: z.string().describe("작업 제목"),
      description: z.string().optional().describe("작업 설명"),
      status: z
        .enum(["heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("초기 상태 (기본: backlog)"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .optional()
        .describe("우선순위 (기본: medium)"),
      assignee: z.string().optional().describe("담당자"),
    }),
  },
  async (params) => {
    const created = await client.createTask(params);
    return object({
      success: true,
      task: created,
    });
  }
);

// Tool 4: get-metrics — backend tool for metrics analysis
server.tool(
  {
    name: "get-metrics",
    description: "에이전트 성능 메트릭을 조회합니다. 토큰 사용량, 성공률, 응답시간 등을 포함합니다.",
    schema: z.object({}),
    annotations: { readOnlyHint: true },
  },
  async () => {
    const metrics = await client.getMetrics();
    return object({ ...metrics });
  }
);

// Tool 5: refresh-dashboard — widget-callable refresh
server.tool(
  {
    name: "refresh-dashboard",
    description: "대시보드 데이터를 새로고침합니다. 위젯에서 호출됩니다.",
    schema: z.object({
      filter: z
        .enum(["all", "heartbeat", "backlog", "todo", "in-progress", "done"])
        .optional()
        .describe("필터 상태"),
    }),
    annotations: { readOnlyHint: true },
  },
  async ({ filter }) => {
    const data = await client.getDashboard(filter);
    return object({
      tasks: data.tasks,
      metrics: data.metrics,
      lastUpdated: data.lastUpdated,
    });
  }
);

server.listen().then(() => {
  console.log("OpenClaw Dashboard server running");
});
