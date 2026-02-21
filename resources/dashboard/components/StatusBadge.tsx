import React from "react";
import type { TaskItem } from "../types";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "bg-red-500/15 text-red-700 dark:text-red-400",
  high: "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  medium: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  low: "bg-gray-500/15 text-gray-600 dark:text-gray-400",
};

export const StatusBadge: React.FC<{ priority: TaskItem["priority"] }> = ({
  priority,
}) => {
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.medium}`}
    >
      {priority}
    </span>
  );
};
