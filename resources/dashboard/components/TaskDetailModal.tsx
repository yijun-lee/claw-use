import React, { useState } from "react";
import type { TaskItem, TaskStatus } from "../types";
import { COLUMNS, STATUS_ORDER } from "../types";
import { StatusBadge } from "./StatusBadge";

interface TaskDetailModalProps {
  task: TaskItem;
  onClose: () => void;
  onSave: (updates: {
    taskId: string;
    title?: string;
    description?: string;
    status?: TaskStatus;
    priority?: "low" | "medium" | "high" | "critical";
    feedback?: string;
  }) => void;
  onAskAI: (message: string) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onSave,
  onAskAI,
}) => {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status as TaskStatus);
  const [priority, setPriority] = useState(task.priority);
  const [newFeedback, setNewFeedback] = useState("");

  const hasChanges =
    title !== task.title ||
    description !== task.description ||
    status !== task.status ||
    priority !== task.priority ||
    newFeedback.trim() !== "";

  const handleSave = () => {
    const updates: Parameters<typeof onSave>[0] = { taskId: task.id };
    if (title !== task.title) updates.title = title;
    if (description !== task.description) updates.description = description;
    if (status !== task.status) updates.status = status;
    if (priority !== task.priority) updates.priority = priority;
    if (newFeedback.trim()) updates.feedback = newFeedback.trim();
    onSave(updates);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-surface-elevated border border-default rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-xs text-secondary font-mono">{task.id}</span>
            <StatusBadge priority={priority} />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-default/10 transition-colors cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>

          {/* Status + Priority row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                {COLUMNS.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as typeof priority)
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div className="text-xs text-secondary">
            Assignee: <span className="font-medium text-default">{task.assignee}</span>
          </div>

          {/* Existing feedback */}
          {task.feedback.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block mb-2">
                Feedback ({task.feedback.length})
              </label>
              <div className="space-y-2">
                {task.feedback.map((fb) => (
                  <div
                    key={fb.id}
                    className="text-xs p-2 rounded-lg bg-default/5 border border-subtle"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-default">{fb.author}</span>
                      <span className="text-secondary">
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-secondary">{fb.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New feedback */}
          <div>
            <label className="text-[11px] font-medium text-secondary uppercase tracking-wider block mb-1">
              Add Feedback
            </label>
            <textarea
              value={newFeedback}
              onChange={(e) => setNewFeedback(e.target.value)}
              rows={2}
              placeholder="Type your feedback..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-default bg-surface text-default resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-secondary/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-subtle">
          <button
            onClick={() =>
              onAskAI(
                `Analyze task "${task.title}" (${task.id}): ${task.description}. Current status: ${task.status}, priority: ${task.priority}. What recommendations do you have?`
              )
            }
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors cursor-pointer"
          >
            Ask AI
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium rounded-lg border border-default hover:bg-default/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
