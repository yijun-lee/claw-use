import React, { useMemo } from "react";
import type { TaskItem, TaskStatus } from "../types";
import { COLUMNS } from "../types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
  tasks: TaskItem[];
  isExpanded: boolean;
  onMoveTask: (taskId: string, direction: "left" | "right") => void;
  onSelectTask: (task: TaskItem) => void;
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  isExpanded,
  onMoveTask,
  onSelectTask,
}) => {
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, TaskItem[]> = {
      heartbeat: [],
      backlog: [],
      todo: [],
      "in-progress": [],
      done: [],
    };
    for (const task of tasks) {
      if (grouped[task.status as TaskStatus]) {
        grouped[task.status as TaskStatus].push(task);
      }
    }
    return grouped;
  }, [tasks]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 kanban-scroll">
      {COLUMNS.map((col) => (
        <KanbanColumn
          key={col.id}
          column={col}
          tasks={tasksByStatus[col.id]}
          isExpanded={isExpanded}
          onMoveTask={onMoveTask}
          onSelectTask={onSelectTask}
        />
      ))}
    </div>
  );
};
