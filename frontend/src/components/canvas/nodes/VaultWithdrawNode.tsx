"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { AtalaWithdrawNodeData } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

function VaultWithdrawNodeInner({ data }: NodeProps) {
  const d = data as AtalaWithdrawNodeData;

  return (
    <div>
      <NodeShell nodeType="atalaWithdraw" title="Vault Withdraw">
        <div className="space-y-2">
          {d.position ? (
            <>
              <p className="text-sm font-semibold" style={{ color: "oklch(0.985 0 0)" }}>
                {d.position.vault.name}
              </p>
              {d.position.vault.asset && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.708 0 0)" }}>Asset</span>
                  <span className="text-sm font-mono" style={{ color: "oklch(0.985 0 0)" }}>{d.position.vault.asset.symbol}</span>
                </div>
              )}
              {d.amount && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "oklch(0.708 0 0)" }}>Amount</span>
                  <span className="text-sm font-mono" style={{ color: "oklch(0.985 0 0)" }}>{d.amount}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs italic" style={{ color: "oklch(0.708 0 0)" }}>
              Select a vault to withdraw
            </p>
          )}
        </div>
      </NodeShell>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !border-2"
        style={{ background: "#fb7185", borderColor: "oklch(0.205 0 0)" }}
      />
    </div>
  );
}

export const VaultWithdrawNode = memo(VaultWithdrawNodeInner);
