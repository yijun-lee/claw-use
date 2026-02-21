import React from "react";
import type { ColumnConfig, TaskItem } from "../types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
  column: ColumnConfig;
  tasks: TaskItem[];
  isExpanded: boolean;
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  onSelectTask: (task: TaskItem) => void;
}

const INLINE_LIMIT = 2;

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  isExpanded,
  onMoveTask,
  onSelectTask,
}) => {
  const visibleTasks = isExpanded ? tasks : tasks.slice(0, INLINE_LIMIT);
  const hiddenCount = tasks.length - visibleTasks.length;

  return (
    <div
      className={`flex-1 min-w-[200px] rounded-xl border ${column.borderClass} ${column.bgClass} p-3`}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${column.dotClass}`} />
        <h3 className="text-xs font-semibold text-default uppercase tracking-wider">
          {column.label}
        </h3>
        <span className="ml-auto text-[10px] font-medium text-secondary bg-default/10 rounded-full px-1.5 py-0.5">
          {tasks.length}
        </span>
      </div>

      {/* Task cards */}
      <div className="flex flex-col gap-2">
        {visibleTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onMoveLeft={() => onMoveTask(task.id, "left")}
            onMoveRight={() => onMoveTask(task.id, "right")}
            onSelect={() => onSelectTask(task)}
          />
        ))}

        {tasks.length === 0 && (
          <div className="text-xs text-secondary text-center py-4 opacity-50">
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
};
