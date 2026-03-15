"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import { useAccount } from "wagmi";
import { useSiloMarkets, type SiloMarketData } from "@/hooks/useSiloMarkets";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { SiloDepositNodeData, SiloPairInfo, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

/** Convert SiloMarketData from the hook into the SiloPairInfo shape used by canvas types. */
function toPairInfo(m: SiloMarketData): SiloPairInfo {
  return {
    configAddress: m.id,
    silo0: m.silo0,
    silo1: m.silo1,
    token0: { address: m.token0, symbol: m.token0Symbol, name: m.token0Symbol, decimals: m.token0Decimals },
    token1: { address: m.token1, symbol: m.token1Symbol, name: m.token1Symbol, decimals: m.token1Decimals },
    totalDeposits0: m.totalDeposits0,
    totalDeposits1: m.totalDeposits1,
    totalBorrows0: m.totalBorrows0,
    totalBorrows1: m.totalBorrows1,
    supplyAPY0: m.supplyAPY0,
    supplyAPY1: m.supplyAPY1,
    borrowAPY0: m.borrowAPY0,
    borrowAPY1: m.borrowAPY1,
    utilization0: m.utilization0,
    utilization1: m.utilization1,
  };
}

function SiloDepositNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SiloDepositNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const edges = useEdges();
  const allNodes = useNodes();
  const { isConnected } = useAccount();
  const { markets, isLoading: marketsLoading } = useSiloMarkets();
  const { assetsWithBalances } = useTokenBalances();

  const selectedPair = d.pair;
  const side = d.side ?? 0;
  const amount = d.amount ?? "";

  // Detect upstream asset to auto-filter markets
  const suggestedAsset = useMemo(() => {
    const incomingEdge = edges.find((e) => e.target === id);
    if (!incomingEdge) return null;
    const sourceNode = allNodes.find((n) => n.id === incomingEdge.source);
    if (!sourceNode) return null;
    const sd = sourceNode.data as Record<string, unknown>;
    if (sd.type === "swap") {
      const tokenOut = sd.tokenOut as TokenInfo | null;
      return tokenOut?.address?.toLowerCase() ?? null;
    }
    if (sd.type === "eulerBorrow") {
      const borrowVault = sd.borrowVault as { asset?: { address: string } } | null;
      return borrowVault?.asset?.address?.toLowerCase() ?? null;
    }
    return null;
  }, [edges, allNodes, id]);

  // Derive the active token from the selected pair and side
  const activeToken: TokenInfo | null = useMemo(() => {
    if (!selectedPair) return null;
    return side === 0 ? selectedPair.token0 : selectedPair.token1;
  }, [selectedPair, side]);

  // Wallet balance for the active token
  const walletBalance = useMemo(() => {
    if (!activeToken) return null;
    return assetsWithBalances.find(
      (a) => a.address.toLowerCase() === activeToken.address.toLowerCase()
    ) ?? null;
  }, [assetsWithBalances, activeToken]);

  const walletBalanceNum = walletBalance ? parseFloat(walletBalance.balance) : 0;
  const currentAmount = parseFloat(amount || "0");
  const exceedsBalance = currentAmount > 0 && walletBalanceNum > 0 && currentAmount > walletBalanceNum;

  // APY and utilization for selected side
  const supplyAPY = selectedPair ? (side === 0 ? selectedPair.supplyAPY0 : selectedPair.supplyAPY1) : 0;
  const utilization = selectedPair ? (side === 0 ? selectedPair.utilization0 : selectedPair.utilization1) : 0;
  const totalDeposits = selectedPair ? (side === 0 ? selectedPair.totalDeposits0 : selectedPair.totalDeposits1) : 0n;

  const marketOptions = useMemo(
    () => markets.map((m) => ({
      value: m.id,
      label: `${m.token0Symbol} / ${m.token1Symbol}`,
    })),
    [markets]
  );

  return (
    <NodeShell
      nodeType="siloDeposit"
      title="Silo Deposit"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={marketsLoading}
    >
      <div className="space-y-2">
        {/* Market selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Silo Market</label>
          <SearchSelect
            options={marketOptions}
            value={selectedPair?.configAddress ?? ""}
            onChange={(configAddr) => {
              const market = markets.find((m) => m.id === configAddr);
              if (!market) return;
              updateNodeData(id, { pair: toPairInfo(market), side: 0, amount: "", amountUsd: 0 });
            }}
            placeholder="Search market..."
          />
        </div>

        {/* Side toggle */}
        {selectedPair && (
          <div>
            <label className="mb-1 block text-[10px]" style={{ color: "#586878" }}>Deposit Side</label>
            <div className="flex overflow-hidden rounded-md border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <button
                onClick={() => side !== 0 && updateNodeData(id, { side: 0, amount: "", amountUsd: 0 })}
                className="flex-1 py-1.5 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: side === 0 ? "rgba(139,92,246,0.2)" : "#0a121c",
                  color: side === 0 ? "#8b5cf6" : "#586878",
                }}
              >
                {selectedPair.token0.symbol}
              </button>
              <button
                onClick={() => side !== 1 && updateNodeData(id, { side: 1, amount: "", amountUsd: 0 })}
                className="flex-1 border-l py-1.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: "rgba(255,255,255,0.08)",
                  backgroundColor: side === 1 ? "rgba(139,92,246,0.2)" : "#0a121c",
                  color: side === 1 ? "#8b5cf6" : "#586878",
                }}
              >
                {selectedPair.token1.symbol}
              </button>
            </div>
          </div>
        )}

        {/* Amount input */}
        {selectedPair && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Amount</label>
              {walletBalance && (
                <span className="text-[10px]" style={{ color: "#586878" }}>
                  Bal: {walletBalance.balance} {activeToken?.symbol}
                </span>
              )}
            </div>
            <div
              className="nodrag flex items-center rounded-lg border px-2 py-1.5"
              style={{
                borderColor: exceedsBalance ? "#eb365a" : "rgba(255,255,255,0.08)",
                backgroundColor: "#0a121c",
              }}
            >
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => updateNodeData(id, { amount: e.target.value, amountUsd: 0 })}
                className="min-w-0 flex-1 bg-transparent text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ color: "#e2e8f0" }}
              />
              <button
                onClick={() => walletBalance && updateNodeData(id, { amount: walletBalance.balance, amountUsd: 0 })}
                disabled={!walletBalance}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}
              >
                MAX
              </button>
            </div>
            {exceedsBalance && (
              <p className="text-[10px]" style={{ color: "#eb365a" }}>
                Amount exceeds wallet balance
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        {selectedPair && (
          <div className="space-y-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Supply APY</span>
              <span className="text-xs font-medium" style={{ color: "#02c77b" }}>
                {formatPercent(supplyAPY)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Utilization</span>
              <span className="text-xs" style={{ color: "#8898a8" }}>
                {formatPercent(utilization)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Total Deposits</span>
              <span className="text-xs" style={{ color: "#8898a8" }}>
                {activeToken ? formatTokenAmount(totalDeposits, activeToken.decimals, 2) : "--"}
              </span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#8b5cf6", backgroundColor: "#0c1218" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#8b5cf6", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(SiloDepositNodeComponent);
