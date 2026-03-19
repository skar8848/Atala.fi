"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { EulerDepositNodeData } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

function SupplyNodeInner({ data }: NodeProps) {
  const d = data as EulerDepositNodeData;

  return (
    <div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2"
        style={{ background: "#34d399", borderColor: "oklch(0.205 0 0)" }}
      />
      <NodeShell nodeType="eulerDeposit" title="Supply">
        <div className="space-y-2">
          {d.vault ? (
            <>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.985 0 0)" }}>
                {d.vault.name}
              </p>
              {d.vault.asset && (
                <Row label="Asset" value={d.vault.asset.symbol} />
              )}
              {d.amount && (
                <Row label="Amount" value={d.amount} />
              )}
              {d.vault.supplyAPY > 0 && (
                <Row label="Supply APY" value={`${d.vault.supplyAPY.toFixed(2)}%`} valueColor="#34d399" />
              )}
            </>
          ) : (
            <p className="text-xs italic" style={{ color: "oklch(0.708 0 0)" }}>
              Select a market to supply
            </p>
          )}
        </div>
      </NodeShell>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2"
        style={{ background: "#34d399", borderColor: "oklch(0.205 0 0)" }}
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

export const SupplyNode = memo(SupplyNodeInner);
