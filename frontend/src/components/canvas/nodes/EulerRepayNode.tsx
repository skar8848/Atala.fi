"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { useAddressPositions } from "@/hooks/useAddressPositions";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { EulerRepayNodeData, EulerVaultInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

function EulerRepayNodeComponent({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const { address } = useAccount();
  const { eulerPositions, loading } = useAddressPositions(address ?? null);
  const d = data as unknown as EulerRepayNodeData;

  // Filter to borrow positions (borrowAssets > 0)
  const borrowPositions = useMemo(
    () => eulerPositions.filter((p) => p.borrowAssets > 0n),
    [eulerPositions]
  );

  // Selected position
  const selectedPosition = useMemo(() => {
    if (!d.vault) return null;
    return borrowPositions.find((p) => p.vault.address === d.vault!.address) ?? null;
  }, [d.vault, borrowPositions]);

  const currentDebt = selectedPosition
    ? Number(selectedPosition.borrowAssets) / 10 ** selectedPosition.vault.asset.decimals
    : 0;
  const assetDecimals = selectedPosition?.vault.asset.decimals ?? 18;
  const assetSymbol = selectedPosition?.vault.asset.symbol ?? "";
  const assetAddress = selectedPosition?.vault.asset.address;

  // Read wallet balance of the debt token
  const balanceContracts = useMemo(() => {
    if (!address || !assetAddress) return [];
    return [{
      address: assetAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    }];
  }, [address, assetAddress]);

  const { data: balanceData } = useReadContracts({
    contracts: balanceContracts.length > 0 ? balanceContracts : undefined,
    query: { enabled: balanceContracts.length > 0, refetchInterval: 15_000 },
  });

  const walletBalance = useMemo(() => {
    if (!balanceData?.[0] || balanceData[0].status !== "success") return 0;
    return Number(balanceData[0].result as bigint) / 10 ** assetDecimals;
  }, [balanceData, assetDecimals]);

  const amount = parseFloat(d.amount || "0");
  const exceedsBalance = amount > 0 && amount > walletBalance;

  const positionOptions = useMemo(
    () => borrowPositions.map((p) => ({
      value: p.vault.address,
      label: `${p.vault.asset.symbol} -- ${(Number(p.borrowAssets) / 10 ** p.vault.asset.decimals).toFixed(4)} debt (${p.vault.name})`,
    })),
    [borrowPositions]
  );

  return (
    <NodeShell
      nodeType="eulerRepay"
      title="Euler Repay"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={loading}
    >
      <div className="space-y-2">
        {/* Position selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Borrow Position</label>
          {!address ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              Connect wallet to see positions
            </div>
          ) : loading ? (
            <div className="mt-0.5 h-7 animate-pulse rounded-lg" style={{ backgroundColor: "#0a121c" }} />
          ) : positionOptions.length === 0 ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              No active borrows
            </div>
          ) : (
            <SearchSelect
              options={positionOptions}
              value={d.vault?.address ?? ""}
              onChange={(addr) => {
                const pos = borrowPositions.find((p) => p.vault.address === addr);
                if (!pos) return;
                updateNodeData(id, { vault: pos.vault, amount: "", amountUsd: 0 });
              }}
              placeholder="Select borrow to repay..."
            />
          )}
        </div>

        {/* Current debt */}
        {selectedPosition && (
          <div className="space-y-1 rounded-lg border px-2.5 py-1.5" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: "#586878" }}>Current debt</span>
              <span className="font-medium" style={{ color: "#e2e8f0" }}>
                {currentDebt.toFixed(6)} {assetSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: "#586878" }}>Borrow APY</span>
              <span style={{ color: "#eb365a" }}>
                {formatPercent(selectedPosition.vault.borrowAPY)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span style={{ color: "#586878" }}>Wallet balance</span>
              <span style={{ color: "#8898a8" }}>
                {walletBalance.toFixed(6)} {assetSymbol}
              </span>
            </div>
          </div>
        )}

        {/* Amount input */}
        {d.vault && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Amount to repay</label>
              {currentDebt > 0 && (
                <button
                  onClick={() => {
                    const repayMax = Math.min(walletBalance, currentDebt);
                    updateNodeData(id, { amount: repayMax.toFixed(assetDecimals > 6 ? 8 : 6), amountUsd: 0 });
                  }}
                  className="text-[9px] hover:underline"
                  style={{ color: "#55c3e9" }}
                >
                  MAX
                </button>
              )}
            </div>
            <div
              className="nodrag flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5"
              style={{
                borderColor: exceedsBalance ? "#eb365a" : "rgba(255,255,255,0.08)",
                backgroundColor: "#0a121c",
              }}
            >
              <input
                type="number"
                value={d.amount}
                onChange={(e) => updateNodeData(id, { amount: e.target.value, amountUsd: 0 })}
                placeholder="0.00"
                className="w-full bg-transparent text-xs outline-none placeholder:opacity-40 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ color: "#e2e8f0" }}
                step="any"
                min="0"
              />
              <span className="shrink-0 text-[10px]" style={{ color: "#586878" }}>
                {assetSymbol}
              </span>
            </div>
            {exceedsBalance && (
              <p className="mt-1 text-[10px]" style={{ color: "#eb365a" }}>
                Exceeds wallet balance ({walletBalance.toFixed(4)} {assetSymbol})
              </p>
            )}
            {amount > 0 && currentDebt > 0 && (
              <div className="mt-1">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "#586878" }}>After repay</span>
                  <span className="text-[10px]" style={{ color: "#02c77b" }}>
                    {currentDebt - amount <= 0 ? "Fully repaid" : `${(currentDebt - amount).toFixed(4)} ${assetSymbol} remaining`}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#1a2332" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      backgroundColor: "#02c77b",
                      width: `${Math.min((amount / currentDebt) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#ef4444", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(EulerRepayNodeComponent);
