"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AtalaDepositNodeData } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

function VaultDepositNodeInner({ data }: NodeProps) {
  const d = data as AtalaDepositNodeData;

  return (
    <div>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !border-2"
        style={{ background: "#a78bfa", borderColor: "oklch(0.205 0 0)" }}
      />
      <NodeShell nodeType="atalaDeposit" title="Vault Deposit">
        <div className="space-y-2">
          {d.vault ? (
            <>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.985 0 0)" }}>
                {d.vault.name}
              </p>
              {d.vault.asset && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.708 0 0)" }}>Asset</span>
                  <span className="text-sm font-mono" style={{ color: "oklch(0.985 0 0)" }}>{d.vault.asset.symbol}</span>
                </div>
              )}
              {d.amount && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.708 0 0)" }}>Amount</span>
                  <span className="text-sm font-mono" style={{ color: "oklch(0.985 0 0)" }}>{d.amount}</span>
                </div>
              )}
              {d.amountUsd > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.708 0 0)" }}>USD Value</span>
                  <span className="text-sm font-mono" style={{ color: "#a78bfa" }}>${d.amountUsd.toFixed(2)}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs italic" style={{ color: "oklch(0.708 0 0)" }}>
              Select a vault
            </p>
          )}
        </div>
      </NodeShell>
    </div>
  );
}

export const VaultDepositNode = memo(VaultDepositNodeInner);
