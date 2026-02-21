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

  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

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

  const handleAskAI = useCallback(
    (message: string) => {
      setSelectedTask(null);
      sendFollowUpMessage(message);
    },
    [sendFollowUpMessage]
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

          {/* Kanban board */}
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
