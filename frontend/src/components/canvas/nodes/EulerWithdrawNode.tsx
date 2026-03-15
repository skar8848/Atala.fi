"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useAccount } from "wagmi";
import { useAddressPositions } from "@/hooks/useAddressPositions";
import { formatPercent } from "@/lib/format";
import type { EulerWithdrawNodeData, EulerPosition } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

function EulerWithdrawNodeComponent({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const { address } = useAccount();
  const { eulerPositions, loading } = useAddressPositions(address ?? null);
  const d = data as unknown as EulerWithdrawNodeData;

  // Filter to supply positions (supplyShares > 0)
  const supplyPositions = useMemo(
    () => eulerPositions.filter((p) => p.supplyShares > 0n),
    [eulerPositions]
  );

  const selectedPosition = d.position;

  // Compute human-readable balance
  const positionBalance = useMemo(() => {
    if (!selectedPosition) return 0;
    const decimals = selectedPosition.vault.asset.decimals;
    return Number(selectedPosition.supplyAssets) / 10 ** decimals;
  }, [selectedPosition]);

  const currentAmount = parseFloat(d.amount || "0");
  const pct = positionBalance > 0 ? Math.min(100, Math.round((currentAmount / positionBalance) * 100)) : 0;

  const exceedsBalance = currentAmount > 0 && currentAmount > positionBalance;

  const positionOptions = useMemo(
    () => supplyPositions.map((p) => ({
      value: p.vault.address,
      label: `${p.vault.asset.symbol} -- ${(Number(p.supplyAssets) / 10 ** p.vault.asset.decimals).toFixed(4)} (${p.vault.name})`,
    })),
    [supplyPositions]
  );

  return (
    <NodeShell
      nodeType="eulerWithdraw"
      title="Euler Withdraw"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={loading}
    >
      <div className="space-y-2">
        {/* Position selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Position</label>
          {!address ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              Connect wallet to see positions
            </div>
          ) : loading ? (
            <div className="mt-0.5 h-7 animate-pulse rounded-lg" style={{ backgroundColor: "#0a121c" }} />
          ) : (
            <SearchSelect
              options={positionOptions}
              value={selectedPosition?.vault.address ?? ""}
              onChange={(addr) => {
                const pos = supplyPositions.find((p) => p.vault.address === addr) ?? null;
                updateNodeData(id, { position: pos, amount: "" });
              }}
              placeholder="Search position..."
            />
          )}
        </div>

        {/* Position info */}
        {selectedPosition && (
          <div className="space-y-1 rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Vault</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>
                {selectedPosition.vault.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Balance</span>
              <span className="text-xs" style={{ color: "#8898a8" }}>
                {positionBalance.toFixed(6)} {selectedPosition.vault.asset.symbol}
              </span>
            </div>
            {selectedPosition.vault.supplyAPY > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#586878" }}>APY</span>
                <span className="text-xs font-medium" style={{ color: "#02c77b" }}>
                  {formatPercent(selectedPosition.vault.supplyAPY)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Amount slider + input */}
        {selectedPosition && (
          <div className="nodrag space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Withdraw Amount</label>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-0.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={pct}
                    onChange={(e) => {
                      const p = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                      updateNodeData(id, { amount: ((positionBalance * p) / 100).toFixed(6) });
                    }}
                    className="w-10 rounded px-1 py-0.5 text-right text-xs font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    style={{ backgroundColor: "#0a121c", color: "#e2e8f0" }}
                  />
                  <span className="text-xs" style={{ color: "#586878" }}>%</span>
                </div>
                <button
                  className="ml-1 text-[10px] hover:opacity-80"
                  style={{ color: "#55c3e9" }}
                  onClick={() => updateNodeData(id, { amount: positionBalance.toFixed(6) })}
                >
                  MAX
                </button>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pct}
              onChange={(e) => {
                const p = parseInt(e.target.value);
                updateNodeData(id, { amount: ((positionBalance * p) / 100).toFixed(6) });
              }}
              className="w-full"
              style={{ accentColor: "#f97316" }}
            />
            <div className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: "#0a121c" }}>
              <span className="text-[10px]" style={{ color: "#586878" }}>
                {currentAmount.toFixed(4)} {selectedPosition.vault.asset.symbol}
              </span>
              <span className="text-[10px]" style={{ color: "#586878" }}>
                of {positionBalance.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#f97316", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(EulerWithdrawNodeComponent);
