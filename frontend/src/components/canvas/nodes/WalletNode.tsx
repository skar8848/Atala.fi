"use client";

import { memo, useMemo } from "react";
import { Handle, Position, useEdges, type NodeProps } from "@xyflow/react";
import { useAccount } from "wagmi";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { TOKENS, type TokenMeta } from "@/config/contracts";
import type { WalletNodeData } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";

const DISPLAY_TOKENS: TokenMeta[] = [
  TOKENS.WAVAX,
  TOKENS.USDC,
  TOKENS.USDT,
  TOKENS.WETH,
  TOKENS.BTCb,
  TOKENS.WBTC,
  TOKENS.SAVAX,
  TOKENS.GGAVAX,
  TOKENS.AUSD,
  TOKENS.AVUSD,
  TOKENS.SAVUSD,
  TOKENS.DEUSD,
  TOKENS.SDEUSD,
  TOKENS.SOLVBTC,
  TOKENS.EURC,
].filter(Boolean);

function WalletNodeComponent({ id, data }: NodeProps) {
  const { address, isConnected } = useAccount();
  const edges = useEdges();
  const isUsed = useMemo(() => edges.some((e) => e.source === id), [edges, id]);
  const { assetsWithBalances, isLoading } = useTokenBalances(DISPLAY_TOKENS);

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "Not connected";

  const nonZeroBalances = assetsWithBalances.filter(
    (a) => a.balanceRaw > 0n
  );

  return (
    <NodeShell nodeType="wallet" title="Wallet" dimmed={!isUsed} loading={isLoading}>
      <div className="space-y-2">
        {/* Address */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "#586878" }}>Address</span>
          <span className="font-mono text-xs" style={{ color: "#e2e8f0" }}>
            {displayAddress}
          </span>
        </div>

        {/* Chain */}
        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "#586878" }}>Chain</span>
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" fill="#E84142" />
              <path
                d="M10.8 9.6c.2-.35.53-.35.73 0l1.17 2.03c.2.35.04.63-.37.63h-2.37c-.4 0-.56-.28-.37-.63L10.8 9.6z"
                fill="white"
              />
              <path
                d="M7.9 4.4c.2-.35.52-.35.72 0l.52.93.24.43.02.03 1.73 3.01c.2.33.04.6-.35.6H5.22c-.4 0-.56-.27-.37-.6L7.9 4.4z"
                fill="white"
              />
            </svg>
            <span className="text-xs" style={{ color: "#8898a8" }}>
              Avalanche
            </span>
          </div>
        </div>

        {/* Balances */}
        {isConnected && (
          <div
            className="mt-2 border-t pt-2"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: "#586878" }}
            >
              Balances
            </span>
            {isLoading ? (
              <div className="mt-1 space-y-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-5 animate-pulse rounded"
                    style={{ backgroundColor: "#0a121c" }}
                  />
                ))}
              </div>
            ) : nonZeroBalances.length > 0 ? (
              <div className="mt-1 max-h-[140px] space-y-1 overflow-y-auto">
                {nonZeroBalances.map((asset) => (
                  <div
                    key={asset.address}
                    className="flex items-center justify-between"
                  >
                    <span className="text-xs" style={{ color: "#8898a8" }}>
                      {asset.symbol}
                    </span>
                    <span className="font-mono text-xs" style={{ color: "#e2e8f0" }}>
                      {asset.balance}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[10px]" style={{ color: "#586878" }}>
                No balances found
              </p>
            )}
          </div>
        )}
      </div>

      {/* Output handle -- wallet only has output */}
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#55c3e9", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(WalletNodeComponent);
