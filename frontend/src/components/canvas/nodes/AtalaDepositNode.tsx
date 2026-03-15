"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { useAtalaVaults, type AtalaVaultData } from "@/hooks/useAtalaVaults";
import type { AtalaDepositNodeData, AtalaVaultInfo, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

function toVaultInfo(v: AtalaVaultData): AtalaVaultInfo {
  return {
    address: v.address,
    name: v.name,
    symbol: v.symbol,
    asset: { address: v.asset, symbol: v.assetSymbol, name: v.assetSymbol, decimals: v.assetDecimals },
    totalAssets: v.totalAssets,
    idle: v.idle,
  };
}

function AtalaDepositNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as AtalaDepositNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const edges = useEdges();
  const allNodes = useNodes();
  const { address } = useAccount();
  const { vaults, isLoading: vaultsLoading } = useAtalaVaults(address);

  // Detect upstream balance
  const { upstreamAmount, upstreamSymbol } = useMemo(() => {
    const incomingEdge = edges.find((e) => e.target === id);
    if (!incomingEdge) return { upstreamAmount: "", upstreamSymbol: "" };
    const sourceNode = allNodes.find((n) => n.id === incomingEdge.source);
    if (!sourceNode) return { upstreamAmount: "", upstreamSymbol: "" };
    const sd = sourceNode.data as Record<string, unknown>;
    if (sd.type === "swap") {
      const tokenOut = sd.tokenOut as TokenInfo | null;
      return { upstreamAmount: String(sd.quoteOut ?? ""), upstreamSymbol: tokenOut?.symbol ?? "" };
    }
    if (sd.type === "eulerBorrow" || sd.type === "siloBorrow") {
      const borrowVault = sd.borrowVault as { asset?: { symbol: string } } | null;
      const pair = sd.pair as { token0?: { symbol: string }; token1?: { symbol: string } } | null;
      let sym = sd.type === "eulerBorrow" ? (borrowVault?.asset?.symbol ?? "") : "";
      if (sd.type === "siloBorrow" && pair) {
        const side = sd.side as 0 | 1 | undefined;
        sym = (side ?? 0) === 0 ? pair.token0?.symbol ?? "" : pair.token1?.symbol ?? "";
      }
      return { upstreamAmount: String(sd.borrowAmount ?? ""), upstreamSymbol: sym };
    }
    return { upstreamAmount: "", upstreamSymbol: "" };
  }, [edges, allNodes, id]);

  const upstreamAmountNum = parseFloat(upstreamAmount || "0");

  // Auto-fill amount from upstream
  const prevUpstreamRef = useRef<string>("");
  useEffect(() => {
    if (upstreamAmount && upstreamAmount !== "0" && upstreamAmount !== prevUpstreamRef.current) {
      prevUpstreamRef.current = upstreamAmount;
      if (d.depositAll !== true) {
        updateNodeData(id, { amount: upstreamAmount });
      }
    }
  }, [upstreamAmount, d.depositAll]);

  // Validation
  const exceedsBalance = useMemo(() => {
    if (!d.amount || d.depositAll) return false;
    const amt = parseFloat(d.amount);
    if (isNaN(amt) || amt <= 0) return false;
    if (upstreamAmountNum > 0 && amt > upstreamAmountNum) return true;
    return false;
  }, [d.amount, d.depositAll, upstreamAmountNum]);

  const vaultOptions = useMemo(
    () => vaults.map((v) => ({
      value: v.address,
      label: `${v.name} (${v.assetSymbol})`,
    })),
    [vaults]
  );

  const selectedAssetDecimals = d.vault?.asset.decimals ?? 18;

  return (
    <NodeShell
      nodeType="atalaDeposit"
      title="Atala Deposit"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={vaultsLoading}
    >
      <div className="space-y-2">
        {/* Vault selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Vault</label>
          <SearchSelect
            options={vaultOptions}
            value={d.vault?.address ?? ""}
            onChange={(addr) => {
              const vault = vaults.find((v) => v.address === addr);
              if (!vault) return;
              updateNodeData(id, { vault: toVaultInfo(vault) });
            }}
            placeholder="Search vault..."
          />
        </div>

        {/* Vault info */}
        {d.vault && (
          <div className="space-y-1 rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Asset</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>{d.vault.asset.symbol}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Total Assets</span>
              <span className="font-mono text-[10px]" style={{ color: "#8898a8" }}>
                {formatUnits(d.vault.totalAssets, selectedAssetDecimals).slice(0, 12)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Idle</span>
              <span className="font-mono text-[10px]" style={{ color: "#8898a8" }}>
                {formatUnits(d.vault.idle, selectedAssetDecimals).slice(0, 12)}
              </span>
            </div>
          </div>
        )}

        {/* Deposit All toggle */}
        <div className="flex items-center justify-between">
          <span className="text-[10px]" style={{ color: "#586878" }}>Deposit All</span>
          <button
            onClick={() => {
              const newVal = !d.depositAll;
              updateNodeData(id, {
                depositAll: newVal,
                amount: newVal ? "" : (upstreamAmountNum > 0 ? upstreamAmountNum.toFixed(6) : ""),
              });
            }}
            className="relative h-4 w-7 rounded-full transition-colors"
            style={{ backgroundColor: d.depositAll ? "#a855f7" : "rgba(255,255,255,0.1)" }}
          >
            <span
              className="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform"
              style={{ left: d.depositAll ? "14px" : "2px" }}
            />
          </button>
        </div>

        {/* Amount input */}
        {!d.depositAll && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Amount</label>
              {upstreamAmountNum > 0 && (
                <button
                  onClick={() => updateNodeData(id, { amount: upstreamAmount })}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
                  style={{ backgroundColor: "rgba(168,85,247,0.1)", color: "#a855f7" }}
                >
                  MAX
                </button>
              )}
            </div>
            <div
              className="nodrag flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
              style={{
                backgroundColor: "#0a121c",
                borderColor: exceedsBalance ? "#eb365a" : "rgba(255,255,255,0.08)",
              }}
            >
              <input
                type="number"
                placeholder="0.00"
                value={d.amount}
                onChange={(e) => updateNodeData(id, { amount: e.target.value })}
                className="w-full bg-transparent font-mono text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ color: "#e2e8f0" }}
              />
              <span className="text-xs" style={{ color: "#586878" }}>
                {d.vault?.asset.symbol ?? ""}
              </span>
            </div>
            {exceedsBalance && (
              <p className="mt-1 text-[10px]" style={{ color: "#eb365a" }}>
                Amount exceeds available balance
              </p>
            )}
          </div>
        )}

        {/* Upstream info */}
        {upstreamAmount && upstreamSymbol && (
          <div className="flex items-center justify-between border-t pt-1.5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <span className="text-[10px]" style={{ color: "#586878" }}>Available</span>
            <span className="font-mono text-[10px]" style={{ color: "#8898a8" }}>
              {upstreamAmount} {upstreamSymbol}
            </span>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#a855f7", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(AtalaDepositNodeComponent);
