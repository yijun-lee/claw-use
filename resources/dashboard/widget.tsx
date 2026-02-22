import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { Expand, PictureInPicture } from "@openai/apps-sdk-ui/components/Icon";
import {
  McpUseProvider,
  useCallTool,
  useWidget,
  type WidgetMetadata,
} from "mcp-use/react";
import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import "../styles.css";
import type { DashboardProps, MetricsData, TaskItem, TaskStatus } from "./types";
import { propSchema, STATUS_ORDER } from "./types";
import { MetricsSummary } from "./components/MetricsSummary";
import { KanbanBoard } from "./components/KanbanBoard";
import { TaskDetailModal } from "./components/TaskDetailModal";

export const widgetMetadata: WidgetMetadata = {
  description:
    "OpenClaw agent task dashboard with kanban board, metrics summary, and task management",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading dashboard...",
    invoked: "Dashboard ready",
  },
};

interface DashboardState {
  screen?: "setup" | "dashboard";
  tasks: TaskItem[];
  metrics: MetricsData;
  lastUpdated: string;
}

const DEFAULT_METRICS: MetricsData = {
  totalTokens: 0,
  estimatedCostUSD: 0,
  successRate: 0,
  avgResponseTimeMs: 0,
  totalTasks: 0,
  completedTasks: 0,
};

type RefreshArgs = { filter?: string } | null;
type UpdateArgs = Record<string, unknown> | null;
type ConnectArgs = { gatewayUrl: string; gatewayToken?: string } | null;
type SendMessageArgs = { sessionKey: string; message: string } | null;
// ---------------------------------------------------------------------------
// Setup Screen — shown when no Gateway URL is configured
// ---------------------------------------------------------------------------

const SetupScreen: React.FC<{
  onConnected: (data: DashboardState) => void;
}> = ({ onConnected }) => {
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [gatewayToken, setGatewayToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isDemoConnecting, setIsDemoConnecting] = useState(false);

  const {
    callToolAsync: connectAsync,
    isPending: isConnecting,
  } = useCallTool<ConnectArgs>("connect-openclaw");

  const isLoading = isConnecting || isDemoConnecting;

  const doConnect = useCallback(async (args: ConnectArgs) => {
    setError(null);
    try {
      const result = await connectAsync(args);
      if (result?.structuredContent) {
        const data = result.structuredContent as unknown as {
          success: boolean;
          tasks: TaskItem[];
          metrics: MetricsData;
          lastUpdated: string;
        };
        if (data.success) {
          onConnected({
            screen: "dashboard",
            tasks: data.tasks,
            metrics: data.metrics,
            lastUpdated: data.lastUpdated,
          });
          return;
        }
      }
      setError("Connection failed. Please check the URL and try again.");
    } catch {
      setError("Connection failed. Please check the URL and try again.");
    }
  }, [connectAsync, onConnected]);

  const handleConnect = useCallback(async () => {
    if (!gatewayUrl.trim()) {
      setError("Please enter a Gateway URL.");
      return;
    }
    const args: ConnectArgs = { gatewayUrl: gatewayUrl.trim() };
    if (gatewayToken.trim()) args!.gatewayToken = gatewayToken.trim();
    await doConnect(args);
  }, [gatewayUrl, gatewayToken, doConnect]);

  const handleDemoConnect = useCallback(async () => {
    setIsDemoConnecting(true);
    await doConnect({
      gatewayUrl: "https://decor-rooms-routers-suspected.trycloudflare.com",
      gatewayToken: "114c2610e5919ab9e288b766cf768ff69078312dee6d4c03",
    });
    setIsDemoConnecting(false);
  }, [doConnect]);

  return (
    <div className="relative bg-surface-elevated border border-default rounded-2xl overflow-hidden">
      <div className="p-6 flex flex-col items-center text-center">
        {/* Logo / icon area */}
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-default mb-1">Connect to OpenClaw</h2>
        <p className="text-sm text-secondary mb-5 max-w-sm">
          Try the demo or connect your own agent cluster.
        </p>

        <div className="w-full max-w-md space-y-4">
          {/* Demo button */}
          <Button
            color="primary"
            size="lg"
            variant="solid"
            onClick={handleDemoConnect}
            disabled={isLoading}
            className="w-full"
          >
            {isDemoConnecting ? "Connecting..." : "Try Demo"}
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-default" />
            <span className="text-xs text-tertiary">or connect your own</span>
            <div className="flex-1 border-t border-default" />
          </div>

          {/* Form */}
          <div className="space-y-3">
            <div className="text-left">
              <label className="block text-xs font-medium text-secondary mb-1">
                Gateway URL <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                value={gatewayUrl}
                onChange={(e) => setGatewayUrl(e.target.value)}
                placeholder="https://your-gateway.example.com"
                className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                disabled={isLoading}
              />
            </div>

            <div className="text-left">
              <label className="block text-xs font-medium text-secondary mb-1">
                Auth Token <span className="text-tertiary">(optional)</span>
              </label>
              <input
                type="password"
                value={gatewayToken}
                onChange={(e) => setGatewayToken(e.target.value)}
                placeholder="Bearer token for authenticated gateways"
                className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/60"
                disabled={isLoading}
              />
            </div>

          {error && (
            <p className="text-xs text-red-400 text-left">{error}</p>
          )}

            <Button
              color="secondary"
              size="lg"
              variant="outline"
              onClick={handleConnect}
              disabled={isLoading || !gatewayUrl.trim()}
              className="w-full"
            >
              {isConnecting ? "Connecting..." : "Connect"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main Dashboard Component
// ---------------------------------------------------------------------------

const Dashboard: React.FC = () => {
  const {
    props,
    isPending,
    displayMode,
    requestDisplayMode,
    sendFollowUpMessage,
    state,
    setState,
  } = useWidget<DashboardProps, DashboardState>();

  const {
    callToolAsync: refreshDashboardAsync,
    isPending: isRefreshing,
  } = useCallTool<RefreshArgs>("refresh-dashboard");

  const {
    callToolAsync: updateTaskAsync,
  } = useCallTool<UpdateArgs>("update-task");

  const {
    callToolAsync: sendMessageAsync,
    isPending: isSending,
  } = useCallTool<SendMessageArgs>("send-message");

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [lastReply, setLastReply] = useState<string | null>(null);

  // Determine current screen: state overrides props
  const screen = state?.screen ?? props?.screen ?? "dashboard";

  // Use state if available (post-interaction), otherwise props (initial render)
  const tasks = useMemo(() => state?.tasks ?? props?.tasks ?? [], [state, props]);
  const metrics = state?.metrics ?? props?.metrics ?? DEFAULT_METRICS;
  const lastUpdated = state?.lastUpdated ?? props?.lastUpdated ?? new Date().toISOString();

  const isExpanded = displayMode === "fullscreen";

  const handleRefresh = useCallback(async () => {
    try {
      const result = await refreshDashboardAsync(
        props?.activeFilter ? { filter: props.activeFilter } : null
      );
      if (result?.structuredContent) {
        const data = result.structuredContent as unknown as DashboardState;
        setState({
          tasks: data.tasks,
          metrics: data.metrics,
          lastUpdated: data.lastUpdated,
        });
      }
    } catch {
      // refresh failed silently
    }
  }, [refreshDashboardAsync, setState, props?.activeFilter]);

  const handleMoveTask = useCallback(
    async (taskId: string, direction: "left" | "right") => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;

      const currentIdx = STATUS_ORDER.indexOf(task.status as TaskStatus);
      const newIdx = direction === "right" ? currentIdx + 1 : currentIdx - 1;
      if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return;

      const newStatus = STATUS_ORDER[newIdx];

      // Optimistic update
      const updatedTasks = tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, updatedAt: new Date().toISOString() }
          : t
      );
      setState({ tasks: updatedTasks, metrics, lastUpdated });

      // Server update
      try {
        await updateTaskAsync({ taskId, status: newStatus });
      } catch {
        // revert on failure — re-fetch would be better
      }
    },
    [tasks, metrics, lastUpdated, setState, updateTaskAsync]
  );

  const handleSaveTask = useCallback(
    async (updates: {
      taskId: string;
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: "low" | "medium" | "high" | "critical";
      feedback?: string;
    }) => {
      // Optimistic update
      const updatedTasks = tasks.map((t) => {
        if (t.id !== updates.taskId) return t;
        const updated = { ...t, updatedAt: new Date().toISOString() };
        if (updates.title) updated.title = updates.title;
        if (updates.description) updated.description = updates.description;
        if (updates.status) updated.status = updates.status;
        if (updates.priority) updated.priority = updates.priority;
        if (updates.feedback) {
          updated.feedback = [
            ...updated.feedback,
            {
              id: `fb-${Date.now()}`,
              author: "user",
              message: updates.feedback,
              createdAt: new Date().toISOString(),
            },
          ];
        }
        return updated;
      });

      setState({ tasks: updatedTasks, metrics, lastUpdated });
      setSelectedTask(null);

      // Server update
      try {
        await updateTaskAsync(updates as unknown as UpdateArgs);
      } catch {
        // update failed silently
      }
    },
    [tasks, metrics, lastUpdated, setState, updateTaskAsync]
  );

  const handleSendMessage = useCallback(
    async () => {
      const msg = messageInput.trim();
      if (!msg) return;
      setMessageInput("");
      setLastReply(null);
      try {
        const result = await sendMessageAsync({
          sessionKey: "agent:main:main",
          message: msg,
        });
        if (result?.structuredContent) {
          const data = result.structuredContent as unknown as {
            reply?: string;
            dashboard?: DashboardState;
          };
          if (data.reply) setLastReply(data.reply);
          if (data.dashboard) {
            setState({
              tasks: data.dashboard.tasks,
              metrics: data.dashboard.metrics,
              lastUpdated: data.dashboard.lastUpdated,
            });
          }
        }
      } catch {
        setLastReply("Failed to send message.");
      }
    },
    [messageInput, sendMessageAsync, setState]
  );

  const handleAskAI = useCallback(
    (message: string) => {
      setSelectedTask(null);
      sendFollowUpMessage(message);
    },
    [sendFollowUpMessage]
  );

  const handleConnected = useCallback(
    (data: DashboardState) => {
      setState(data);
    },
    [setState]
  );

  // Loading state
  if (isPending || !props) {
    return (
      <McpUseProvider>
        <div className="bg-surface-elevated border border-default rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-5 w-40 rounded bg-default/10 animate-pulse" />
          </div>
          <div className="flex gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-1 h-20 rounded-xl bg-default/10 animate-pulse" />
            ))}
          </div>
          <div className="flex gap-3 mt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-1 h-40 rounded-xl bg-default/5 animate-pulse" />
            ))}
          </div>
        </div>
      </McpUseProvider>
    );
  }

  // Setup screen — gateway not configured
  if (screen === "setup") {
    return (
      <McpUseProvider>
        <AppsSDKUIProvider linkComponent={Link}>
          <SetupScreen onConnected={handleConnected} />
        </AppsSDKUIProvider>
      </McpUseProvider>
    );
  }

  // Dashboard screen
  return (
    <McpUseProvider>
      <AppsSDKUIProvider linkComponent={Link}>
        <div className="relative bg-surface-elevated border border-default rounded-2xl overflow-hidden">
          {/* Header bar */}
          <div className="flex items-center justify-between p-4 pb-0">
            <div>
              <h2 className="text-base font-bold text-default">OpenClaw Dashboard</h2>
              <p className="text-xs text-secondary mt-0.5">
                {tasks.length} tasks across {new Set(tasks.map((t) => t.assignee)).size} agents
              </p>
            </div>

            {/* Display mode controls */}
            <div className="flex items-center gap-1.5">
              {!isExpanded && displayMode !== "pip" && (
                <>
                  <Button
                    color="secondary"
                    pill
                    size="lg"
                    uniform
                    variant="outline"
                    onClick={() => requestDisplayMode("pip")}
                    title="Picture-in-picture"
                  >
                    <PictureInPicture />
                  </Button>
                  <Button
                    color="secondary"
                    pill
                    size="lg"
                    uniform
                    variant="outline"
                    onClick={() => requestDisplayMode("fullscreen")}
                    title="Expand"
                  >
                    <Expand />
                  </Button>
                </>
              )}
              {(isExpanded || displayMode === "pip") && (
                <Button
                  color="secondary"
                  pill
                  size="lg"
                  uniform
                  variant="outline"
                  onClick={() => requestDisplayMode("inline")}
                  title="Collapse"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </Button>
              )}
            </div>
          </div>

          {/* Metrics summary */}
          <div className="px-4 py-3">
            <MetricsSummary
              metrics={metrics}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
            />
          </div>

          {/* Task list */}
          <div className="px-4 pb-4">
            <KanbanBoard
              tasks={tasks}
              isExpanded={isExpanded}
              onMoveTask={handleMoveTask}
              onSelectTask={setSelectedTask}
            />
          </div>

          {/* Task detail modal */}
          {selectedTask && (
            <TaskDetailModal
              task={selectedTask}
              onClose={() => setSelectedTask(null)}
              onSave={handleSaveTask}
              onAskAI={handleAskAI}
            />
          )}
        </div>
      </AppsSDKUIProvider>
    </McpUseProvider>
  );
};

export default Dashboard;
