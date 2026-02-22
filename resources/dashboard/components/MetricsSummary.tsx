import React from "react";
import type { MetricsData } from "../types";

interface MetricsSummaryProps {
  metrics: MetricsData;
  lastUpdated: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}

function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const CHANNEL_COLORS: Record<string, string> = {
  discord: "bg-indigo-500",
  webchat: "bg-emerald-500",
  unknown: "bg-gray-400",
};

export const MetricsSummary: React.FC<MetricsSummaryProps> = ({
  metrics,
  lastUpdated,
  onRefresh,
  isRefreshing,
}) => {
  const ctxUtil = metrics.contextUtilization ?? 0;
  const breakdown = metrics.channelBreakdown ?? {};
  const totalBreakdownTokens = Object.values(breakdown).reduce((a: number, b: number) => a + b, 0) || 1;

  return (
    <div className="space-y-3">
      {/* Top row: main metrics */}
      <div className="flex items-stretch gap-3 flex-wrap">
        {/* Token Usage */}
        <div className="flex-1 min-w-[120px] rounded-xl border border-default bg-surface p-3">
          <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
            Tokens
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-bold text-default">
              {formatTokens(metrics.totalTokens)}
            </span>
            <span className="text-xs text-secondary">
              ~${metrics.estimatedCostUSD.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Context Utilization */}
        <div className="flex-1 min-w-[120px] rounded-xl border border-default bg-surface p-3">
          <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
            Context
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-default">
              {ctxUtil}%
            </span>
            <div className="flex-1 h-1.5 rounded-full bg-default/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  ctxUtil > 80 ? "bg-red-500" : ctxUtil > 50 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${ctxUtil}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="flex-1 min-w-[120px] rounded-xl border border-default bg-surface p-3">
          <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
            Success
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

        {/* Sessions */}
        <div className="flex-1 min-w-[120px] rounded-xl border border-default bg-surface p-3">
          <div className="text-[11px] font-medium text-secondary uppercase tracking-wider mb-1">
            Sessions
          </div>
          <span className="text-lg font-bold text-default">
            {metrics.totalTasks}
          </span>
        </div>

        {/* Refresh */}
        <div className="flex flex-col items-end justify-center gap-1">
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
                ...
              </span>
            ) : (
              "Refresh"
            )}
          </button>
          <span className="text-[10px] text-secondary">{timeAgo(lastUpdated)}</span>
        </div>
      </div>

      {/* Bottom row: channel breakdown bar */}
      {Object.keys(breakdown).length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 h-2 rounded-full overflow-hidden bg-default/5">
            {Object.entries(breakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([ch, tokens]) => (
                <div
                  key={ch}
                  className={`h-full rounded-full ${CHANNEL_COLORS[ch] || "bg-sky-500"}`}
                  style={{ width: `${((tokens as number) / totalBreakdownTokens) * 100}%` }}
                  title={`${ch}: ${formatTokens(tokens as number)} tokens`}
                />
              ))}
          </div>
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {Object.entries(breakdown)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([ch, tokens]) => (
                <div key={ch} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${CHANNEL_COLORS[ch] || "bg-sky-500"}`} />
                  <span className="text-[10px] text-secondary">
                    {ch} {formatTokens(tokens as number)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};
