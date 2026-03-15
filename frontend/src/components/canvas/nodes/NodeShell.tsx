"use client";

import type { ReactNode } from "react";
import { NODE_COLORS } from "@/lib/canvas/types";

interface NodeShellProps {
  nodeType: string;
  title: string;
  children: ReactNode;
  onDelete?: () => void;
  invalid?: boolean;
  dimmed?: boolean;
  loading?: boolean;
}

export default function NodeShell({
  nodeType,
  title,
  children,
  onDelete,
  invalid,
  dimmed,
  loading,
}: NodeShellProps) {
  const accent = NODE_COLORS[nodeType] ?? "#6b7079";

  return (
    <div
      className={`min-w-[260px] max-w-[320px] rounded-xl border shadow-lg transition-opacity duration-300 ${
        dimmed ? "opacity-40" : "opacity-100"
      }`}
      style={{
        backgroundColor: "#0c1218",
        borderColor: invalid ? "#eb365a" : `${accent}33`,
        boxShadow: invalid
          ? "0 0 12px rgba(235, 54, 90, 0.3)"
          : `0 0 12px ${accent}15`,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between rounded-t-xl px-3 py-2"
        style={{ backgroundColor: `${accent}18` }}
      >
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="text-xs font-semibold" style={{ color: accent }}>
            {title}
          </span>
          {loading && (
            <div className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
          )}
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-white/5"
            style={{ color: "#586878" }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path
                d="M1 1L9 9M9 1L1 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-3">{children}</div>
    </div>
  );
}
