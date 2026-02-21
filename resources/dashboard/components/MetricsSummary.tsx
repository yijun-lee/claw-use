import React from "react";
import type { MetricsData } from "../types";

interface MetricsSummaryProps {
  metrics: MetricsData;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function formatTime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  metrics,
  lastUpdated,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Token Usage */}
      <div className="flex-1 min-w-[140px] rounded-xl border border-default bg-surface p-3">
        <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
          Token Usage
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-bold text-default">
            {metrics.totalTokens.toLocaleString()}
          </span>
          <span className="text-xs text-secondary">
            ${metrics.estimatedCostUSD.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Success Rate */}
      <div className="flex-1 min-w-[140px] rounded-xl border border-default bg-surface p-3">
        <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
          Success Rate
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-default">
            {metrics.successRate}%
          </span>
          <div className="flex-1 h-1.5 rounded-full bg-default/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${metrics.successRate}%` }}
            />
          </div>
        </div>
      </div>

      {/* Avg Response */}
      <div className="flex-1 min-w-[140px] rounded-xl border border-default bg-surface p-3">
        <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
          Avg Response
        </div>
        <div className="text-lg font-bold text-default">
          {formatTime(metrics.avgResponseTimeMs)}
        </div>
      </div>

      {/* Refresh + last updated */}
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-default bg-surface hover:bg-surface-elevated transition-colors cursor-pointer disabled:opacity-50"
        >
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Refreshing
            </span>
          ) : (
            "Refresh"
          )}
        </button>
        <span className="text-[10px] text-secondary">{timeAgo(lastUpdated)}</span>
      </div>
    </div>
  );
};
