import React from "react";
import type { TaskItem, TaskStatus } from "../types";
import { STATUS_ORDER } from "../types";
import { StatusBadge } from "./StatusBadge";

interface TaskCardProps {
  task: TaskItem;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSelect: () => void;
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

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onMoveLeft,
  onMoveRight,
  onSelect,
}) => {
  const statusIdx = STATUS_ORDER.indexOf(task.status as TaskStatus);
  const canMoveLeft = statusIdx > 0;
  const canMoveRight = statusIdx < STATUS_ORDER.length - 1;

  return (
    <div
      className="rounded-lg border border-default bg-surface p-3 cursor-pointer hover:bg-surface-elevated transition-colors group"
      onClick={onSelect}
    >
      {/* Title + priority */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-medium text-default truncate flex-1">
          {task.title}
        </h4>
        <StatusBadge priority={task.priority} />
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[11px] text-secondary">
        <span>{task.assignee}</span>
        <span>{timeAgo(task.updatedAt)}</span>
      </div>

      {/* Feedback indicator */}
      {task.feedback.length > 0 && (
        <div className="mt-1.5 text-[10px] text-secondary flex items-center gap-1">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {task.feedback.length} feedback
        </div>
      )}

      {/* Move arrows */}
      <div
        className="flex items-center justify-between mt-2 pt-2 border-t border-subtle opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={canMoveLeft ? onMoveLeft : undefined}
          disabled={!canMoveLeft}
          className="px-2 py-0.5 text-xs rounded hover:bg-default/10 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
          title="Move to previous status"
        >
          ← prev
        </button>
        <button
          onClick={canMoveRight ? onMoveRight : undefined}
          disabled={!canMoveRight}
          className="px-2 py-0.5 text-xs rounded hover:bg-default/10 disabled:opacity-30 cursor-pointer disabled:cursor-default transition-colors"
          title="Move to next status"
        >
          next →
        </button>
      </div>
    </div>
  );
};
