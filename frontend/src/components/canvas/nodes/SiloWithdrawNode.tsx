"use client";

import { memo, useCallback, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useAccount, useReadContracts } from "wagmi";
import { useSiloMarkets, type SiloMarketData } from "@/hooks/useSiloMarkets";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { SiloWithdrawNodeData, SiloPairInfo, SiloPosition, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

function toPairInfo(m: SiloMarketData): SiloPairInfo {
  return {
    configAddress: m.id, silo0: m.silo0, silo1: m.silo1,
    token0: { address: m.token0, symbol: m.token0Symbol, name: m.token0Symbol, decimals: m.token0Decimals },
    token1: { address: m.token1, symbol: m.token1Symbol, name: m.token1Symbol, decimals: m.token1Decimals },
    totalDeposits0: m.totalDeposits0, totalDeposits1: m.totalDeposits1,
    totalBorrows0: m.totalBorrows0, totalBorrows1: m.totalBorrows1,
    supplyAPY0: m.supplyAPY0, supplyAPY1: m.supplyAPY1,
    borrowAPY0: m.borrowAPY0, borrowAPY1: m.borrowAPY1,
    utilization0: m.utilization0, utilization1: m.utilization1,
  };
}

function SiloWithdrawNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SiloWithdrawNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const { address: userAddress, isConnected } = useAccount();
  const { markets, isLoading: marketsLoading } = useSiloMarkets();

  const selectedPosition = d.position;
  const amount = d.amount ?? "";

  // Read balances for all silos
  const siloAddresses = useMemo(
    () => markets.flatMap((m) => [m.silo0, m.silo1] as `0x${string}`[]),
    [markets]
  );

  const { data: balanceData, isLoading: balancesLoading } = useReadContracts({
    contracts: userAddress
      ? siloAddresses.map((silo) => ({
          address: silo,
          abi: [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const,
          functionName: "balanceOf" as const,
          args: [userAddress] as const,
        }))
      : undefined,
    query: { enabled: !!userAddress && siloAddresses.length > 0, staleTime: 30_000 },
  });

  const userPositions = useMemo(() => {
    if (!balanceData) return [];
    const positions: { market: SiloMarketData; side: 0 | 1; depositAssets: bigint }[] = [];
    let idx = 0;
    for (const market of markets) {
      for (const side of [0, 1] as const) {
        const result = balanceData[idx];
        if (result?.status === "success") {
          const balance = result.result as bigint;
          if (balance > 0n) positions.push({ market, side, depositAssets: balance });
        }
        idx++;
      }
    }
    return positions;
  }, [balanceData, markets]);

  const activeToken: TokenInfo | null = useMemo(() => {
    if (!selectedPosition) return null;
    return selectedPosition.side === 0 ? selectedPosition.pair.token0 : selectedPosition.pair.token1;
  }, [selectedPosition]);

  const positionBalance = useMemo(() => {
    if (!selectedPosition || !activeToken) return 0;
    return Number(selectedPosition.depositAssets) / 10 ** activeToken.decimals;
  }, [selectedPosition, activeToken]);

  const currentAmount = parseFloat(amount || "0");
  const pct = positionBalance > 0 ? Math.min(100, Math.round((currentAmount / positionBalance) * 100)) : 0;
  const exceedsBalance = currentAmount > 0 && currentAmount > positionBalance;

  const supplyAPY = selectedPosition
    ? (selectedPosition.side === 0 ? selectedPosition.pair.supplyAPY0 : selectedPosition.pair.supplyAPY1)
    : 0;

  const positionOptions = useMemo(
    () => userPositions.map((pos, idx) => {
      const token = pos.side === 0 ? pos.market.token0Symbol : pos.market.token1Symbol;
      const decimals = pos.side === 0 ? pos.market.token0Decimals : pos.market.token1Decimals;
      return {
        value: `${pos.market.id}-${pos.side}`,
        label: `${pos.market.token0Symbol}/${pos.market.token1Symbol} - ${token} (${formatTokenAmount(pos.depositAssets, decimals, 4)})`,
      };
    }),
    [userPositions]
  );

  const selectedKey = selectedPosition
    ? `${selectedPosition.pair.configAddress}-${selectedPosition.side}`
    : "";

  return (
    <NodeShell
      nodeType="siloWithdraw"
      title="Silo Withdraw"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={marketsLoading || balancesLoading}
    >
      <div className="space-y-2">
        {/* Position selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Supply Position</label>
          {!isConnected ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              Connect wallet to view positions
            </div>
          ) : userPositions.length === 0 && !balancesLoading ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              No Silo supply positions found
            </div>
          ) : (
            <SearchSelect
              options={positionOptions}
              value={selectedKey}
              onChange={(key) => {
                const [configAddr, sideStr] = key.split("-");
                const side = parseInt(sideStr) as 0 | 1;
                const pos = userPositions.find((p) => p.market.id === configAddr && p.side === side);
                if (!pos) return;
                const pair = toPairInfo(pos.market);
                const position: SiloPosition = { pair, side: pos.side, depositAssets: pos.depositAssets, borrowAssets: 0n };
                updateNodeData(id, { position, amount: "" });
              }}
              placeholder="Search position..."
            />
          )}
        </div>

        {/* Amount + slider */}
        {selectedPosition && (
          <div className="nodrag space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Withdraw Amount</label>
              <div className="flex items-center gap-1">
                <span className="text-[10px]" style={{ color: "#586878" }}>{pct}%</span>
                <button
                  onClick={() => updateNodeData(id, { amount: positionBalance.toFixed(6) })}
                  className="text-[10px] hover:opacity-80"
                  style={{ color: "#55c3e9" }}
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
              style={{ accentColor: "#f59e0b" }}
            />
            <div className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: "#0a121c" }}>
              <span className="text-[10px]" style={{ color: "#586878" }}>
                {currentAmount.toFixed(4)} {activeToken?.symbol}
              </span>
              <span className="text-[10px]" style={{ color: "#586878" }}>
                of {positionBalance.toFixed(4)}
              </span>
            </div>
          </div>
        )}

        {/* Stats */}
        {selectedPosition && (
          <div className="space-y-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Market</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>
                {selectedPosition.pair.token0.symbol} / {selectedPosition.pair.token1.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Supply APY</span>
              <span className="text-xs font-medium" style={{ color: "#02c77b" }}>
                {formatPercent(supplyAPY)}
              </span>
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#f59e0b", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(SiloWithdrawNodeComponent);
