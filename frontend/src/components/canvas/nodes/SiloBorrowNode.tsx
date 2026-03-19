"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import { useReadContracts } from "wagmi";
import { siloLensAbi, SILO_ADDRESSES } from "@/config/silo";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { SiloBorrowNodeData, SiloDepositNodeData, SiloPairInfo, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

const DEFAULT_MAX_LTV = 85;
const DEFAULT_LT = 90;

function SiloBorrowNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SiloBorrowNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const edges = useEdges();
  const nodes = useNodes();

  // Find upstream SiloDeposit via incoming edge
  const upstreamDeposit = useMemo(() => {
    const incomingEdge = edges.find((e) => e.target === id);
    if (!incomingEdge) return null;
    const sourceNode = nodes.find((n) => n.id === incomingEdge.source);
    if (!sourceNode) return null;
    const srcData = sourceNode.data as Record<string, unknown>;
    if (srcData.type !== "siloDeposit") return null;
    return srcData as unknown as SiloDepositNodeData;
  }, [edges, nodes, id]);

  const pair: SiloPairInfo | null = upstreamDeposit?.pair ?? d.pair ?? null;
  const depositSide: 0 | 1 = upstreamDeposit?.side ?? 0;
  const borrowSide: 0 | 1 = depositSide === 0 ? 1 : 0;
  const depositAmount = upstreamDeposit?.amount ?? "";
  const depositAmountNum = parseFloat(depositAmount) || 0;
  const ltvPercent = d.ltvPercent ?? 0;

  const collateralToken: TokenInfo | null = useMemo(() => {
    if (!pair) return null;
    return depositSide === 0 ? pair.token0 : pair.token1;
  }, [pair, depositSide]);

  const borrowToken: TokenInfo | null = useMemo(() => {
    if (!pair) return null;
    return borrowSide === 0 ? pair.token0 : pair.token1;
  }, [pair, borrowSide]);

  // Read on-chain maxLtv and liquidity
  const borrowSiloAddress = useMemo(() => {
    if (!pair) return undefined;
    return (borrowSide === 0 ? pair.silo0 : pair.silo1) as `0x${string}`;
  }, [pair, borrowSide]);

  const lensAddress = SILO_ADDRESSES.SILO_LENS as `0x${string}`;

  const { data: onChainData } = useReadContracts({
    contracts: borrowSiloAddress
      ? [
          { address: lensAddress, abi: siloLensAbi, functionName: "getMaxLtv", args: [borrowSiloAddress] },
          { address: lensAddress, abi: siloLensAbi, functionName: "getLt", args: [borrowSiloAddress] },
          { address: lensAddress, abi: siloLensAbi, functionName: "liquidity", args: [borrowSiloAddress] },
        ]
      : undefined,
    query: { enabled: !!borrowSiloAddress, staleTime: 30_000 },
  });

  const maxLtv = useMemo(() => {
    if (onChainData?.[0]?.status === "success")
      return Math.min(Number(onChainData[0].result as bigint) / 1e16, 100);
    return DEFAULT_MAX_LTV;
  }, [onChainData]);

  const liquidationThreshold = useMemo(() => {
    if (onChainData?.[1]?.status === "success")
      return Math.min(Number(onChainData[1].result as bigint) / 1e16, 100);
    return DEFAULT_LT;
  }, [onChainData]);

  const availableLiquidity = useMemo(() => {
    if (onChainData?.[2]?.status === "success") return onChainData[2].result as bigint;
    return 0n;
  }, [onChainData]);

  const borrowAPY = pair ? (borrowSide === 0 ? pair.borrowAPY0 : pair.borrowAPY1) : 0;
  const borrowAmount = depositAmountNum > 0 && ltvPercent > 0 ? (depositAmountNum * ltvPercent) / 100 : 0;
  const healthFactor = ltvPercent > 0 ? liquidationThreshold / ltvPercent : null;

  const hfColor = (hf: number | null) => {
    if (hf === null) return "#586878";
    if (hf >= 2) return "#02c77b";
    if (hf >= 1.5) return "#eab308";
    if (hf >= 1.1) return "#f97316";
    return "#eb365a";
  };

  const liquidityNum = borrowToken ? Number(availableLiquidity) / 10 ** borrowToken.decimals : 0;
  const exceedsLiquidity = borrowAmount > 0 && borrowAmount > liquidityNum;

  // Sync computed values
  useEffect(() => {
    updateNodeData(id, {
      pair,
      side: borrowSide,
      borrowAmount,
      healthFactor,
      depositAmountUsd: 0,
      borrowAmountUsd: 0,
    });
  }, [pair, borrowSide, borrowAmount, healthFactor]);

  const handleLtvChange = useCallback((value: number) => {
    const clamped = Math.min(Math.max(value, 0), maxLtv);
    updateNodeData(id, { ltvPercent: clamped });
  }, [id, maxLtv, updateNodeData]);

  return (
    <NodeShell
      nodeType="siloBorrow"
      title="Silo Borrow"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsLiquidity}
    >
      <div className="space-y-2">
        {/* Pair info */}
        {pair ? (
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Market</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>
                {pair.token0.symbol} / {pair.token1.symbol}
              </span>
            </div>
          </div>
        ) : (
          <div className="rounded-lg px-2 py-1.5 text-center text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
            Connect a Silo Deposit node
          </div>
        )}

        {/* Collateral info */}
        {pair && upstreamDeposit && (
          <div className="space-y-1 rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Collateral</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>
                {depositAmount || "0"} {collateralToken?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Borrow Asset</span>
              <span className="text-xs" style={{ color: "#8898a8" }}>{borrowToken?.symbol}</span>
            </div>
          </div>
        )}

        {/* LTV slider */}
        {pair && upstreamDeposit && (
          <div className="nodrag">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>
                LTV ({ltvPercent.toFixed(1)}%)
              </label>
              <span className="text-[10px]" style={{ color: "#586878" }}>
                Max {maxLtv.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={maxLtv}
              step={0.5}
              value={ltvPercent}
              onChange={(e) => handleLtvChange(parseFloat(e.target.value))}
              className="mt-1 w-full"
              style={{ accentColor: "#BD0931" }}
            />
            <div className="mt-1.5 flex gap-1">
              {[25, 50, 75].map((pct) => {
                const clampedPct = Math.min(pct, maxLtv);
                return (
                  <button
                    key={pct}
                    onClick={() => handleLtvChange(clampedPct)}
                    className="flex-1 rounded py-0.5 text-[10px] font-medium transition-colors"
                    style={{
                      backgroundColor: Math.abs(ltvPercent - clampedPct) < 0.5 ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.05)",
                      color: Math.abs(ltvPercent - clampedPct) < 0.5 ? "#BD0931" : "#586878",
                    }}
                  >
                    {pct}%
                  </button>
                );
              })}
              <button
                onClick={() => handleLtvChange(maxLtv)}
                className="flex-1 rounded py-0.5 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: Math.abs(ltvPercent - maxLtv) < 0.5 ? "rgba(6,182,212,0.2)" : "rgba(255,255,255,0.05)",
                  color: Math.abs(ltvPercent - maxLtv) < 0.5 ? "#BD0931" : "#586878",
                }}
              >
                Max
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {pair && upstreamDeposit && (
          <div className="space-y-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Borrow Amount</span>
              <span className="text-xs font-medium" style={{ color: "#e2e8f0" }}>
                {borrowAmount > 0 ? `${borrowAmount.toFixed(4)} ${borrowToken?.symbol}` : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Borrow APY</span>
              <span className="text-xs" style={{ color: "#eb365a" }}>
                {formatPercent(borrowAPY)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Health Factor</span>
              <span className="text-xs font-semibold" style={{ color: hfColor(healthFactor) }}>
                {healthFactor !== null ? healthFactor.toFixed(2) : "--"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Available Liquidity</span>
              <span className="text-xs" style={{ color: "#8898a8" }}>
                {borrowToken ? formatTokenAmount(availableLiquidity, borrowToken.decimals, 2) : "--"} {borrowToken?.symbol}
              </span>
            </div>
          </div>
        )}

        {exceedsLiquidity && borrowToken && (
          <div className="rounded-lg border px-2 py-1.5 text-[10px]" style={{ borderColor: "rgba(235,54,90,0.2)", backgroundColor: "rgba(235,54,90,0.05)", color: "#eb365a" }}>
            Borrow exceeds available liquidity
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#BD0931", backgroundColor: "#0c1218" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#BD0931", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(SiloBorrowNodeComponent);
