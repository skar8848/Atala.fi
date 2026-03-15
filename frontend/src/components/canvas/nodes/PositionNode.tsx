"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { formatUnits } from "viem";
import { formatPercent } from "@/lib/format";
import type { PositionNodeData, EulerPosition, SiloPosition, AtalaPosition } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

// Protocol badges
const PROTOCOL_BADGES: Record<string, { label: string; color: string }> = {
  euler: { label: "Euler V2", color: "#2973ff" },
  silo: { label: "Silo V2", color: "#8b5cf6" },
  atala: { label: "Atala", color: "#a855f7" },
};

interface PositionDetail {
  asset: string;
  balance: string;
  balanceLabel: string;
  apy: string | null;
  extraRows: { label: string; value: string }[];
}

function extractEulerDetail(pos: EulerPosition): PositionDetail {
  const decimals = pos.vault.asset.decimals;
  const supplyFormatted = formatUnits(pos.supplyAssets, decimals);
  const borrowFormatted = formatUnits(pos.borrowAssets, decimals);
  const extra: { label: string; value: string }[] = [];
  if (pos.borrowAssets > 0n) {
    extra.push({ label: "Borrowed", value: `${borrowFormatted.slice(0, 12)} ${pos.vault.asset.symbol}` });
  }
  return {
    asset: pos.vault.asset.symbol,
    balance: supplyFormatted.slice(0, 12),
    balanceLabel: "Supplied",
    apy: pos.vault.supplyAPY > 0 ? `${pos.vault.supplyAPY.toFixed(2)}%` : null,
    extraRows: extra,
  };
}

function extractSiloDetail(pos: SiloPosition): PositionDetail {
  const token = pos.side === 0 ? pos.pair.token0 : pos.pair.token1;
  const decimals = token.decimals;
  const depositFormatted = formatUnits(pos.depositAssets, decimals);
  const supplyAPY = pos.side === 0 ? pos.pair.supplyAPY0 : pos.pair.supplyAPY1;
  const extra: { label: string; value: string }[] = [];
  if (pos.borrowAssets > 0n) {
    const borrowToken = pos.side === 0 ? pos.pair.token1 : pos.pair.token0;
    extra.push({ label: "Borrowed", value: `${formatUnits(pos.borrowAssets, borrowToken.decimals).slice(0, 12)} ${borrowToken.symbol}` });
  }
  extra.push({ label: "Pair", value: `${pos.pair.token0.symbol} / ${pos.pair.token1.symbol}` });
  return {
    asset: token.symbol,
    balance: depositFormatted.slice(0, 12),
    balanceLabel: "Deposited",
    apy: supplyAPY > 0 ? `${supplyAPY.toFixed(2)}%` : null,
    extraRows: extra,
  };
}

function extractAtalaDetail(pos: AtalaPosition): PositionDetail {
  const decimals = pos.vault.asset.decimals;
  const assetsFormatted = formatUnits(pos.assets, decimals);
  const sharesFormatted = formatUnits(pos.shares, decimals);
  return {
    asset: pos.vault.asset.symbol,
    balance: assetsFormatted.slice(0, 12),
    balanceLabel: "Position",
    apy: null,
    extraRows: [
      { label: "Shares", value: sharesFormatted.slice(0, 12) },
      { label: "Vault", value: pos.vault.name.length > 20 ? `${pos.vault.name.slice(0, 18)}...` : pos.vault.name },
    ],
  };
}

function PositionNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as PositionNodeData;
  const { deleteElements } = useReactFlow();

  const badge = PROTOCOL_BADGES[d.protocol] ?? { label: d.protocol, color: "#6b7079" };

  const detail = useMemo((): PositionDetail | null => {
    switch (d.protocol) {
      case "euler":
        return d.eulerPosition ? extractEulerDetail(d.eulerPosition) : null;
      case "silo":
        return d.siloPosition ? extractSiloDetail(d.siloPosition) : null;
      case "atala":
        return d.atalaPosition ? extractAtalaDetail(d.atalaPosition) : null;
      default:
        return null;
    }
  }, [d.protocol, d.eulerPosition, d.siloPosition, d.atalaPosition]);

  return (
    <NodeShell
      nodeType="position"
      title="Position"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
    >
      <div className="space-y-2">
        {/* Protocol badge */}
        <div className="flex items-center gap-2">
          <span
            className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: `${badge.color}15`, color: badge.color }}
          >
            {badge.label}
          </span>
          {detail?.apy && (
            <span
              className="ml-auto rounded-md px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: "rgba(2,199,123,0.1)", color: "#02c77b" }}
            >
              {detail.apy} APY
            </span>
          )}
        </div>

        {/* Position data */}
        {detail ? (
          <div className="space-y-1.5 rounded-lg px-2.5 py-2" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Asset</span>
              <span className="text-xs font-medium" style={{ color: "#e2e8f0" }}>
                {detail.asset}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>
                {detail.balanceLabel}
              </span>
              <span className="font-mono text-xs" style={{ color: "#e2e8f0" }}>
                {detail.balance} {detail.asset}
              </span>
            </div>
            {detail.extraRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "#586878" }}>{row.label}</span>
                <span className="font-mono text-[10px]" style={{ color: "#8898a8" }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg px-2.5 py-3" style={{ backgroundColor: "#0a121c" }}>
            <p className="text-center text-[10px]" style={{ color: "#586878" }}>
              No position data loaded
            </p>
          </div>
        )}

        {/* Hint */}
        <p className="text-center text-[10px]" style={{ color: "#586878" }}>
          Read-only -- connect to withdraw or swap
        </p>
      </div>

      {/* Output handle -- positions can connect to withdraw/supply/swap */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#6b7079", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(PositionNodeComponent);
