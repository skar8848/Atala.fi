"use client";

import { memo, useCallback, useMemo } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useAccount, useReadContracts } from "wagmi";
import { useSiloMarkets, type SiloMarketData } from "@/hooks/useSiloMarkets";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { SiloRepayNodeData, SiloPairInfo, TokenInfo } from "@/lib/canvas/types";
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

function SiloRepayNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as SiloRepayNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const { address: userAddress, isConnected } = useAccount();
  const { markets, isLoading: marketsLoading } = useSiloMarkets();
  const { assetsWithBalances } = useTokenBalances();

  const selectedPair = d.pair;
  const side = d.side ?? 0;
  const amount = d.amount ?? "";

  // Read debt balances via maxRepay
  const siloAddresses = useMemo(
    () => markets.flatMap((m) => [m.silo0, m.silo1] as `0x${string}`[]),
    [markets]
  );

  const { data: debtData, isLoading: debtsLoading } = useReadContracts({
    contracts: userAddress
      ? siloAddresses.map((silo) => ({
          address: silo,
          abi: [{ inputs: [{ name: "_borrower", type: "address" }], name: "maxRepay", outputs: [{ name: "", type: "uint256" }], stateMutability: "view", type: "function" }] as const,
          functionName: "maxRepay" as const,
          args: [userAddress] as const,
        }))
      : undefined,
    query: { enabled: !!userAddress && siloAddresses.length > 0, staleTime: 30_000 },
  });

  const userDebts = useMemo(() => {
    if (!debtData) return [];
    const debts: { market: SiloMarketData; side: 0 | 1; debtAssets: bigint }[] = [];
    let idx = 0;
    for (const market of markets) {
      for (const s of [0, 1] as const) {
        const result = debtData[idx];
        if (result?.status === "success") {
          const debt = result.result as bigint;
          if (debt > 0n) debts.push({ market, side: s, debtAssets: debt });
        }
        idx++;
      }
    }
    return debts;
  }, [debtData, markets]);

  const activeToken: TokenInfo | null = useMemo(() => {
    if (!selectedPair) return null;
    return side === 0 ? selectedPair.token0 : selectedPair.token1;
  }, [selectedPair, side]);

  const currentDebt = useMemo(() => {
    if (!selectedPair) return null;
    return userDebts.find((dd) => dd.market.id === selectedPair.configAddress && dd.side === side) ?? null;
  }, [selectedPair, side, userDebts]);

  const debtNum = currentDebt && activeToken
    ? Number(currentDebt.debtAssets) / 10 ** activeToken.decimals
    : 0;

  const borrowAPY = selectedPair ? (side === 0 ? selectedPair.borrowAPY0 : selectedPair.borrowAPY1) : 0;

  const walletBalance = useMemo(() => {
    if (!activeToken) return null;
    return assetsWithBalances.find((a) => a.address.toLowerCase() === activeToken.address.toLowerCase()) ?? null;
  }, [assetsWithBalances, activeToken]);

  const walletBalanceNum = walletBalance ? parseFloat(walletBalance.balance) : 0;
  const amountNum = parseFloat(amount || "0");
  const exceedsBalance = amountNum > 0 && walletBalanceNum > 0 && amountNum > walletBalanceNum;

  const debtOptions = useMemo(
    () => userDebts.map((debt) => {
      const token = debt.side === 0 ? debt.market.token0Symbol : debt.market.token1Symbol;
      const decimals = debt.side === 0 ? debt.market.token0Decimals : debt.market.token1Decimals;
      return {
        value: `${debt.market.id}-${debt.side}`,
        label: `${debt.market.token0Symbol}/${debt.market.token1Symbol} - ${formatTokenAmount(debt.debtAssets, decimals, 4)} ${token}`,
      };
    }),
    [userDebts]
  );

  const selectedKey = selectedPair ? `${selectedPair.configAddress}-${side}` : "";

  return (
    <NodeShell
      nodeType="siloRepay"
      title="Silo Repay"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={marketsLoading || debtsLoading}
    >
      <div className="space-y-2">
        {/* Debt selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Borrow Position</label>
          {!isConnected ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              Connect wallet to view debts
            </div>
          ) : userDebts.length === 0 && !debtsLoading ? (
            <div className="mt-0.5 rounded-lg px-2 py-1.5 text-[10px]" style={{ backgroundColor: "#0a121c", color: "#586878" }}>
              No Silo borrow positions found
            </div>
          ) : (
            <SearchSelect
              options={debtOptions}
              value={selectedKey}
              onChange={(key) => {
                const [configAddr, sideStr] = key.split("-");
                const s = parseInt(sideStr) as 0 | 1;
                const debt = userDebts.find((dd) => dd.market.id === configAddr && dd.side === s);
                if (!debt) return;
                updateNodeData(id, { pair: toPairInfo(debt.market), side: debt.side, amount: "", amountUsd: 0 });
              }}
              placeholder="Select debt to repay..."
            />
          )}
        </div>

        {/* Amount input */}
        {selectedPair && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Repay Amount</label>
              {walletBalance && (
                <span className="text-[10px]" style={{ color: "#586878" }}>
                  Bal: {walletBalance.balance} {activeToken?.symbol}
                </span>
              )}
            </div>
            <div
              className="nodrag flex items-center gap-1 rounded-lg border px-2 py-1.5"
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
                onClick={() => {
                  if (!currentDebt || !activeToken) return;
                  const debtHuman = Number(currentDebt.debtAssets) / 10 ** activeToken.decimals;
                  updateNodeData(id, { amount: debtHuman.toFixed(6), amountUsd: 0 });
                }}
                disabled={!currentDebt}
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40"
                style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}
              >
                MAX
              </button>
            </div>
            {exceedsBalance && (
              <p className="mt-1 text-[10px]" style={{ color: "#eb365a" }}>
                Amount exceeds wallet balance
              </p>
            )}
          </div>
        )}

        {/* Stats */}
        {selectedPair && (
          <div className="space-y-1 border-t pt-2" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Market</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>
                {selectedPair.token0.symbol} / {selectedPair.token1.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Current Debt</span>
              <span className="text-xs font-medium" style={{ color: "#eb365a" }}>
                {debtNum.toFixed(6)} {activeToken?.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Borrow APY</span>
              <span className="text-xs" style={{ color: "#eb365a" }}>
                {formatPercent(borrowAPY)}
              </span>
            </div>
            {/* Repay progress */}
            {currentDebt && amountNum > 0 && (
              <div className="mt-1">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-[10px]" style={{ color: "#586878" }}>After Repay</span>
                  <span className="text-[10px]" style={{ color: "#02c77b" }}>
                    {debtNum - amountNum <= 0 ? "Fully repaid" : `${(debtNum - amountNum).toFixed(4)} ${activeToken?.symbol} remaining`}
                  </span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "#1a2332" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ backgroundColor: "#02c77b", width: `${Math.min((amountNum / debtNum) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal indicator */}
        <div className="flex items-center justify-center gap-1 border-t pt-1.5" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#ef4444" }} />
          <span className="text-[9px] uppercase" style={{ color: "#586878" }}>Terminal Node</span>
        </div>
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

export default memo(SiloRepayNodeComponent);
