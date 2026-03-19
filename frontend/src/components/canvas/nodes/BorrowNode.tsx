"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EulerBorrowNodeData } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

function BorrowNodeInner({ data }: NodeProps) {
  const d = data as EulerBorrowNodeData;

  return (
    <div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2"
        style={{ background: "#f97316", borderColor: "oklch(0.205 0 0)" }}
      />
      <NodeShell nodeType="eulerBorrow" title="Borrow">
        <div className="space-y-2">
          {d.borrowVault ? (
            <>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.985 0 0)" }}>
                {d.borrowVault.name}
              </p>
              {d.borrowAmount > 0 && (
                <Row label="Amount" value={`$${d.borrowAmountUsd.toFixed(2)}`} valueColor="#f97316" />
              )}
              {d.healthFactor !== null && (
                <Row label="Health" value={d.healthFactor.toFixed(2)} />
              )}
            </>
          ) : (
            <p className="text-xs italic" style={{ color: "oklch(0.708 0 0)" }}>
              Select a market to borrow
            </p>
          )}
        </div>
      </NodeShell>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2"
        style={{ background: "#f97316", borderColor: "oklch(0.205 0 0)" }}
      />
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs" style={{ color: "oklch(0.708 0 0)" }}>{label}</span>
      <span className="text-sm font-mono" style={{ color: valueColor ?? "oklch(0.985 0 0)" }}>{value}</span>
    </div>
  );
}

export const BorrowNode = memo(BorrowNodeInner);
