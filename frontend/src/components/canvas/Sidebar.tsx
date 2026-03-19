"use client";

import { type DragEvent } from "react";
import { DRAGGABLE_NODE_TYPES, NODE_COLORS } from "@/lib/canvas/types";

/** Sidebar node palette derived from DRAGGABLE_NODE_TYPES */
const SIDEBAR_NODES = DRAGGABLE_NODE_TYPES.map((n) => ({
  type: n.type,
  label: n.label,
  desc: n.protocol,
}));

/** Protocol accent colours for the markets list */
const PROTOCOL_COLORS: Record<string, string> = {
  euler: "#2973ff",
  silo: "#8b5cf6",
  morpho: "#06b6d4",
  atala: "#a855f7",
};
import type { UnifiedMarket } from "@/hooks/useUnifiedMarkets";
import { formatPercent } from "@/lib/format";

interface SidebarProps {
  markets: UnifiedMarket[];
  isLoading: boolean;
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({
  markets,
  isLoading,
  collapsed,
  onToggle,
}: SidebarProps) {
  const onDragStart = (e: DragEvent, type: string, extra?: string) => {
    e.dataTransfer.setData("application/reactflow-type", type);
    if (extra) e.dataTransfer.setData("application/reactflow-extra", extra);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside
      className="h-full border-r flex flex-col transition-all duration-200"
      style={{
        width: collapsed ? 48 : 260,
        borderColor: "oklch(1 0 0 / 10%)",
        background: "oklch(0.205 0 0 / 90%)",
        backdropFilter: "blur(12px)",
      }}
    >
      <button
        onClick={onToggle}
        className="h-10 flex items-center justify-center text-sm transition-colors border-b"
        style={{
          color: "oklch(0.708 0 0)",
          borderColor: "oklch(1 0 0 / 10%)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.985 0 0)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.708 0 0)")}
      >
        {collapsed ? ">" : "<"}
      </button>

      {collapsed ? null : (
        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Node palette */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "oklch(0.708 0 0)" }}>
              Components
            </p>
            <div className="space-y-1.5">
              {SIDEBAR_NODES.map((item) => (
                <div
                  key={item.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.type)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.269 0 0 / 60%)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ background: NODE_COLORS[item.type] }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight" style={{ color: "oklch(0.985 0 0)" }}>
                      {item.label}
                    </p>
                    <p className="text-[10px] leading-tight truncate" style={{ color: "oklch(0.708 0 0)" }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Markets quick-add */}
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "oklch(0.708 0 0)" }}>
              Markets ({markets.length})
            </p>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: "oklch(0.269 0 0)" }} />
                ))}
              </div>
            ) : (
              <div className="space-y-1 max-h-[400px] overflow-y-auto">
                {markets.slice(0, 30).map((m) => (
                  <div
                    key={m.id}
                    draggable
                    onDragStart={(e) => onDragStart(e, "supply", m.id)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.269 0 0 / 60%)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: PROTOCOL_COLORS[m.protocol] ?? "#666" }}
                      />
                      <span className="text-xs font-medium truncate" style={{ color: "oklch(0.985 0 0)" }}>
                        {m.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono shrink-0 ml-2" style={{ color: "#34d399" }}>
                      {formatPercent(m.supplyAPY)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
