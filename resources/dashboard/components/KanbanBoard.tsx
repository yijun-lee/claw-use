import React, { useMemo } from "react";
import type { TaskItem, TaskStatus } from "../types";
import { COLUMNS, STATUS_ORDER } from "../types";

interface TaskListProps {
  tasks: TaskItem[];
  isExpanded: boolean;
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  onSelectTask: (task: TaskItem) => void;
  onDeleteTask?: (taskId: string) => void;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

export const KanbanBoard: React.FC<TaskListProps> = ({
  tasks,
  isExpanded,
  onMoveTask,
  onSelectTask,
  onDeleteTask,
}) => {
  const grouped = useMemo(() => {
    const map: Record<TaskStatus, TaskItem[]> = {
      heartbeat: [],
      backlog: [],
      todo: [],
      "in-progress": [],
      done: [],
    };
    for (const task of tasks) {
      if (map[task.status as TaskStatus]) {
        map[task.status as TaskStatus].push(task);
      }
    }
    return map;
  }, [tasks]);

  const INLINE_LIMIT = 5;

  return (
    <div className="flex flex-col gap-4">
      {COLUMNS.map((col) => {
        const colTasks = grouped[col.id];
        const visible = isExpanded ? colTasks : colTasks.slice(0, INLINE_LIMIT);
        const hiddenCount = colTasks.length - visible.length;

        return (
          <div key={col.id}>
            {/* Section header */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${col.dotClass}`} />
              <h3 className="text-xs font-semibold text-default uppercase tracking-wider">
                {col.label}
              </h3>
              <span className="text-[10px] font-medium text-secondary bg-default/10 rounded-full px-1.5 py-0.5">
                {colTasks.length}
              </span>
            </div>

            {/* Task rows */}
            <div className="flex flex-col gap-1">
              {visible.map((task) => {
                const tokens = task.tokens || 0;
                const ctxPct = task.contextPercent || 0;

                return (
                  <div
                    key={task.id}
                    className="rounded-lg border border-default bg-surface px-3 py-2 cursor-pointer hover:bg-surface-elevated transition-colors group"
                    onClick={() => onSelectTask(task)}
                  >
                    {/* Top row: delete + dot + title + meta */}
                    <div className="flex items-center gap-2">
                      {/* Delete button */}
                      {onDeleteTask && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                          className="shrink-0 p-0.5 rounded hover:bg-red-500/10 text-tertiary hover:text-red-500"
                          title="Remove"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      )}
                      <div className={`w-2 h-2 rounded-full shrink-0 ${col.dotClass}`} />
                      <span className="text-sm font-medium text-default truncate flex-1 min-w-0">
                        {task.title}
                      </span>

                      {tokens > 0 && (
                        <span className="text-[11px] text-secondary shrink-0 font-mono">
                          {formatTokens(tokens)}
                        </span>
                      )}

                      {ctxPct > 0 && (
                        <div className="w-10 h-1.5 rounded-full bg-default/10 overflow-hidden shrink-0" title={`${ctxPct}% context used`}>
                          <div
                            className={`h-full rounded-full transition-all ${
                              ctxPct > 80 ? "bg-red-500" : ctxPct > 50 ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(ctxPct, 100)}%` }}
                          />
                        </div>
                      )}

                      <span className="text-[10px] text-tertiary shrink-0 uppercase">
                        {task.assignee}
                      </span>

                      <span className="text-[11px] text-secondary shrink-0 w-12 text-right">
                        {timeAgo(task.updatedAt)}
                      </span>
                    </div>

                    {/* Bottom row: last message preview */}
                    {(task.lastMessage || task.description) && (
                      <div className="flex items-center gap-2 mt-1 ml-4">
                        <p className="text-[11px] text-secondary truncate flex-1">
                          {task.lastMessage || task.description}
                        </p>
                        {(task.messageCount ?? 0) > 0 && (
                          <span className="text-[10px] text-tertiary shrink-0">
                            {task.messageCount} msgs
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div className="text-xs text-secondary text-center py-2 opacity-40">
                  No sessions
                </div>
              )}

              {hiddenCount > 0 && (
                <div className="text-[11px] text-secondary text-center py-1">
                  +{hiddenCount} more
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
