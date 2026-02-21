import React, { useMemo } from "react";
import type { TaskItem, TaskStatus } from "../types";
import { COLUMNS, STATUS_ORDER } from "../types";
import { StatusBadge } from "./StatusBadge";

interface TaskListProps {
  tasks: TaskItem[];
  isExpanded: boolean;
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  onSelectTask: (task: TaskItem) => void;
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

const COLUMN_MAP = Object.fromEntries(COLUMNS.map((c) => [c.id, c]));

export const KanbanBoard: React.FC<TaskListProps> = ({
  tasks,
  isExpanded,
  onMoveTask,
  onSelectTask,
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

  const INLINE_LIMIT = 3;

  return (
    <div className="flex flex-col gap-3">
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
            <div className="flex flex-col gap-1.5">
              {visible.map((task) => {
                const statusIdx = STATUS_ORDER.indexOf(task.status as TaskStatus);
                const canLeft = statusIdx > 0;
                const canRight = statusIdx < STATUS_ORDER.length - 1;

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-lg border border-default bg-surface px-3 py-2 cursor-pointer hover:bg-surface-elevated transition-colors group"
                    onClick={() => onSelectTask(task)}
                  >
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${col.dotClass}`} />

                    {/* Title */}
                    <span className="text-sm font-medium text-default truncate flex-1 min-w-0">
                      {task.title}
                    </span>

                    {/* Priority */}
                    <StatusBadge priority={task.priority} />

                    {/* Assignee */}
                    <span className="text-[11px] text-secondary shrink-0 hidden sm:inline">
                      {task.assignee}
                    </span>

                    {/* Time */}
                    <span className="text-[11px] text-secondary shrink-0 w-14 text-right">
                      {timeAgo(task.updatedAt)}
                    </span>

                    {/* Move buttons */}
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={canLeft ? () => onMoveTask(task.id, "left") : undefined}
                        disabled={!canLeft}
                        className="px-1.5 py-0.5 text-[11px] rounded hover:bg-default/10 disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        title="Move to previous status"
                      >
                        ←
                      </button>
                      <button
                        onClick={canRight ? () => onMoveTask(task.id, "right") : undefined}
                        disabled={!canRight}
                        className="px-1.5 py-0.5 text-[11px] rounded hover:bg-default/10 disabled:opacity-20 cursor-pointer disabled:cursor-default"
                        title="Move to next status"
                      >
                        →
                      </button>
                    </div>
                  </div>
                );
              })}

              {colTasks.length === 0 && (
                <div className="text-xs text-secondary text-center py-3 opacity-40">
                  No tasks
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

      {tasks.length === 0 && (
        <div className="text-sm text-secondary text-center py-8 opacity-50">
          No tasks
        </div>
      )}
    </div>
  );
};
