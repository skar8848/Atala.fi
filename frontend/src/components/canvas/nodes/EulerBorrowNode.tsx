"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { useEulerVaults, type VaultData } from "@/hooks/useEulerVaults";
import { ALL_VAULT_ADDRESSES } from "@/hooks/useVaultDiscovery";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { EulerBorrowNodeData, EulerVaultInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

const MAX_LTV_SLIDER = 95;

/** Convert a VaultData (from hook) into the EulerVaultInfo shape stored in node data. */
function toVaultInfo(v: VaultData): EulerVaultInfo {
  return {
    address: v.address,
    name: v.name,
    symbol: v.symbol,
    asset: {
      address: v.asset,
      symbol: v.assetSymbol,
      name: v.assetName,
      decimals: v.assetDecimals,
    },
    totalAssets: v.totalAssets,
    totalBorrows: v.totalBorrows,
    supplyAPY: v.supplyAPY,
    borrowAPY: v.borrowAPY,
    utilization: v.utilization,
  };
}

function EulerBorrowNodeComponent({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const d = data as unknown as EulerBorrowNodeData;
  const { address } = useAccount();
  const { vaults, isLoading: vaultsLoading } = useEulerVaults(ALL_VAULT_ADDRESSES);

  // ── Collateral vault selector ──
  const collateralVaultOptions = useMemo(
    () =>
      vaults.map((v) => ({
        value: v.address,
        label: `${v.assetSymbol} -- ${v.name} -- ${formatPercent(v.supplyAPY)} APY`,
      })),
    [vaults],
  );

  const handleCollateralVaultChange = useCallback(
    (addr: string) => {
      const vault = vaults.find((v) => v.address === addr);
      if (!vault) return;
      updateNodeData(id, {
        collateralVault: toVaultInfo(vault),
        collateralAmount: "",
        borrowVault: null,
        borrowAmount: 0,
        borrowAmountUsd: 0,
        healthFactor: null,
        ltvPercent: 50,
      });
    },
    [vaults, id, updateNodeData],
  );

  // Live collateral vault data
  const selectedCollateralVault = useMemo(() => {
    if (!d.collateralVault) return null;
    return vaults.find((v) => v.address === d.collateralVault!.address) ?? null;
  }, [d.collateralVault, vaults]);

  // ── Wallet balance for collateral asset ──
  const balanceContracts = useMemo(() => {
    if (!address || !selectedCollateralVault) return [];
    return [
      {
        address: selectedCollateralVault.asset as `0x${string}`,
        abi: erc20Abi,
        functionName: "balanceOf" as const,
        args: [address] as const,
      },
    ];
  }, [address, selectedCollateralVault]);

  const { data: balanceData } = useReadContracts({
    contracts: balanceContracts.length > 0 ? balanceContracts : undefined,
    query: { enabled: balanceContracts.length > 0, refetchInterval: 15_000 },
  });

  const walletBalance = useMemo(() => {
    if (!balanceData?.[0] || balanceData[0].status !== "success") return 0n;
    return balanceData[0].result as bigint;
  }, [balanceData]);

  const walletBalanceNum = selectedCollateralVault
    ? Number(walletBalance) / 10 ** selectedCollateralVault.assetDecimals
    : 0;

  const collateralAmount = parseFloat(d.collateralAmount || "0");
  const exceedsBalance = collateralAmount > 0 && walletBalanceNum > 0 && collateralAmount > walletBalanceNum;

  // ── Borrow vault selector ──
  const borrowVaultOptions = useMemo(() => {
    const filtered = d.collateralVault
      ? vaults.filter((v) => v.address !== d.collateralVault!.address)
      : vaults;
    return filtered.map((v) => ({
      value: v.address,
      label: `${v.assetSymbol} -- ${v.name} -- ${formatPercent(v.borrowAPY)} Borrow`,
    }));
  }, [vaults, d.collateralVault]);

  const handleBorrowVaultChange = useCallback(
    (addr: string) => {
      const vault = vaults.find((v) => v.address === addr);
      if (!vault) return;
      updateNodeData(id, {
        borrowVault: toVaultInfo(vault),
        borrowAmount: 0,
        borrowAmountUsd: 0,
      });
    },
    [vaults, id, updateNodeData],
  );

  // Live borrow vault data
  const selectedBorrowVault = useMemo(() => {
    if (!d.borrowVault) return null;
    return vaults.find((v) => v.address === d.borrowVault!.address) ?? null;
  }, [d.borrowVault, vaults]);

  // Available liquidity in borrow vault
  const availableLiquidity = useMemo(() => {
    if (!selectedBorrowVault) return 0n;
    const avail = selectedBorrowVault.totalAssets - selectedBorrowVault.totalBorrows;
    return avail > 0n ? avail : 0n;
  }, [selectedBorrowVault]);

  const availableLiquidityNum = selectedBorrowVault
    ? Number(availableLiquidity) / 10 ** selectedBorrowVault.assetDecimals
    : 0;

  // ── LTV → borrow amount calculation (simplified: assumes 1:1 price ratio) ──
  const borrowAmount = useMemo(() => {
    if (!collateralAmount || !d.ltvPercent) return 0;
    return (collateralAmount * d.ltvPercent) / 100;
  }, [collateralAmount, d.ltvPercent]);

  const healthFactor = useMemo(() => {
    if (d.ltvPercent === 0) return null;
    return 100 / d.ltvPercent;
  }, [d.ltvPercent]);

  const exceedsLiquidity = borrowAmount > 0 && borrowAmount > availableLiquidityNum;

  // Persist computed values
  const prevComputedRef = useRef({ borrowAmount: 0, healthFactor: null as number | null });
  useEffect(() => {
    if (
      borrowAmount !== prevComputedRef.current.borrowAmount ||
      healthFactor !== prevComputedRef.current.healthFactor
    ) {
      prevComputedRef.current = { borrowAmount, healthFactor };
      updateNodeData(id, { borrowAmount, healthFactor });
    }
  }, [borrowAmount, healthFactor, id, updateNodeData]);

  // ── Helpers ──
  const hfColor = (hf: number | null) => {
    if (hf === null) return "#586878";
    if (hf > 2) return "#02c77b";
    if (hf > 1.2) return "#eab308";
    return "#eb365a";
  };

  return (
    <NodeShell
      nodeType="eulerBorrow"
      title="Euler V2 Borrow"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance || exceedsLiquidity}
      loading={vaultsLoading}
    >
      <div className="space-y-2">
        {/* ── Collateral Vault ── */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>
            Collateral Vault
          </label>
          <SearchSelect
            options={collateralVaultOptions}
            value={d.collateralVault?.address ?? ""}
            onChange={handleCollateralVaultChange}
            placeholder="Select collateral vault..."
          />
        </div>

        {/* ── Collateral Amount ── */}
        {selectedCollateralVault && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>
                Collateral Amount
              </label>
              {walletBalanceNum > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    updateNodeData(id, {
                      collateralAmount: walletBalanceNum.toFixed(6),
                    })
                  }
                  className="text-[9px] transition-colors hover:opacity-80"
                  style={{ color: "#586878" }}
                >
                  MAX
                </button>
              )}
            </div>
            <div
              className="nodrag relative flex items-center rounded-lg border"
              style={{
                backgroundColor: "#0a121c",
                borderColor: exceedsBalance
                  ? "#eb365a"
                  : "rgba(255,255,255,0.08)",
              }}
            >
              <input
                type="number"
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ color: "#e2e8f0" }}
                value={d.collateralAmount}
                onChange={(e) =>
                  updateNodeData(id, { collateralAmount: e.target.value })
                }
              />
              <span
                className="pr-2 text-[10px]"
                style={{ color: "#586878" }}
              >
                {selectedCollateralVault.assetSymbol}
              </span>
            </div>
            {exceedsBalance && (
              <p className="text-[10px]" style={{ color: "#eb365a" }}>
                Exceeds wallet balance (
                {walletBalanceNum.toFixed(4)}{" "}
                {selectedCollateralVault.assetSymbol})
              </p>
            )}
            {/* Wallet balance row */}
            <div
              className="flex items-center justify-between rounded-lg px-2 py-1"
              style={{ backgroundColor: "#0a121c" }}
            >
              <span className="text-[10px]" style={{ color: "#586878" }}>
                Wallet
              </span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {walletBalanceNum.toFixed(4)}{" "}
                {selectedCollateralVault.assetSymbol}
              </span>
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        {selectedCollateralVault && collateralAmount > 0 && (
          <div
            className="border-t"
            style={{ borderColor: "rgba(255,255,255,0.06)" }}
          />
        )}

        {/* ── Borrow Vault ── */}
        {selectedCollateralVault && collateralAmount > 0 && (
          <div>
            <label className="text-[10px]" style={{ color: "#586878" }}>
              Borrow Vault
            </label>
            <SearchSelect
              options={borrowVaultOptions}
              value={d.borrowVault?.address ?? ""}
              onChange={handleBorrowVaultChange}
              placeholder="Select borrow vault..."
            />
          </div>
        )}

        {/* ── Borrow Vault Stats ── */}
        {selectedBorrowVault && (
          <div
            className="space-y-1 rounded-lg px-2 py-1.5"
            style={{ backgroundColor: "#0a121c" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>
                Borrow APY
              </span>
              <span
                className="text-[10px] font-medium"
                style={{ color: "#eb365a" }}
              >
                {formatPercent(selectedBorrowVault.borrowAPY)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>
                Liquidity
              </span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {formatTokenAmount(
                  availableLiquidity,
                  selectedBorrowVault.assetDecimals,
                )}{" "}
                {selectedBorrowVault.assetSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>
                Utilization
              </span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {formatPercent(selectedBorrowVault.utilization)}
              </span>
            </div>
          </div>
        )}

        {/* ── LTV Slider ── */}
        {selectedBorrowVault && selectedCollateralVault && (
          <div className="nodrag">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>
                Target LTV
              </label>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={MAX_LTV_SLIDER}
                  value={d.ltvPercent}
                  onChange={(e) => {
                    const val = Math.max(
                      0,
                      Math.min(MAX_LTV_SLIDER, parseInt(e.target.value) || 0),
                    );
                    updateNodeData(id, { ltvPercent: val });
                  }}
                  className="w-10 rounded px-1 py-0.5 text-right text-xs font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ backgroundColor: "#0a121c", color: "#e2e8f0" }}
                />
                <span className="text-xs" style={{ color: "#586878" }}>
                  %
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_LTV_SLIDER}
              value={d.ltvPercent}
              onChange={(e) =>
                updateNodeData(id, { ltvPercent: parseInt(e.target.value) })
              }
              className="mt-1 w-full"
              style={{ accentColor: "#39a699" }}
            />
            <div
              className="flex justify-between text-[9px]"
              style={{ color: "#586878" }}
            >
              <span>0%</span>
              <span>{MAX_LTV_SLIDER}% max</span>
            </div>
          </div>
        )}

        {/* ── Borrow Amount + Health Factor ── */}
        {selectedBorrowVault &&
          selectedCollateralVault &&
          d.ltvPercent > 0 && (
            <div
              className="flex items-center justify-between rounded-lg px-2 py-1.5"
              style={{
                backgroundColor: exceedsLiquidity
                  ? "rgba(235,54,90,0.05)"
                  : "#0a121c",
                borderColor: exceedsLiquidity
                  ? "rgba(235,54,90,0.3)"
                  : "transparent",
                borderWidth: exceedsLiquidity ? 1 : 0,
                borderStyle: "solid",
              }}
            >
              <div>
                <span className="text-[10px]" style={{ color: "#586878" }}>
                  Borrow
                </span>
                <p
                  className="text-xs font-medium"
                  style={{ color: "#e2e8f0" }}
                >
                  {borrowAmount > 0
                    ? `${borrowAmount.toFixed(4)} ${selectedBorrowVault.assetSymbol}`
                    : "--"}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px]" style={{ color: "#586878" }}>
                  Health Factor
                </span>
                <p
                  className="text-xs font-semibold"
                  style={{ color: hfColor(healthFactor) }}
                >
                  {healthFactor ? `${healthFactor.toFixed(2)}x` : "--"}
                </p>
              </div>
            </div>
          )}

        {/* ── Liquidity Warning ── */}
        {exceedsLiquidity && selectedBorrowVault && (
          <div
            className="rounded-lg border px-2 py-1.5 text-[10px]"
            style={{
              borderColor: "rgba(235,54,90,0.2)",
              backgroundColor: "rgba(235,54,90,0.05)",
              color: "#eb365a",
            }}
          >
            Insufficient liquidity -- only{" "}
            {availableLiquidityNum.toFixed(4)}{" "}
            {selectedBorrowVault.assetSymbol} available
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#39a699", backgroundColor: "#0c1218" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#39a699", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(EulerBorrowNodeComponent);
