"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import { useEulerVaults, type VaultData } from "@/hooks/useEulerVaults";
import { ALL_VAULT_ADDRESSES } from "@/hooks/useVaultDiscovery";
import { formatPercent, formatTokenAmount } from "@/lib/format";
import type { EulerBorrowNodeData, EulerVaultInfo, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

const MAX_LTV_SLIDER = 95;

function EulerBorrowNodeComponent({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const d = data as unknown as EulerBorrowNodeData;
  const edges = useEdges();
  const nodes = useNodes();
  const { vaults, isLoading: vaultsLoading } = useEulerVaults(ALL_VAULT_ADDRESSES);

  // Find upstream EulerDeposit for collateral info
  const { collateralVault, connectedAmount, collateralSources } = useMemo(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    if (incomingEdges.length === 0) return { collateralVault: null, connectedAmount: 0, collateralSources: [] as { nodeId: string; label: string; amount: number }[] };

    let collVault: EulerVaultInfo | null = null;
    const sources: { nodeId: string; label: string; amount: number }[] = [];

    for (const edge of incomingEdges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;
      const sd = sourceNode.data as Record<string, unknown>;

      if (sd.type === "eulerDeposit") {
        const vault = sd.vault as EulerVaultInfo | null;
        const amt = parseFloat((sd.amount as string) || "0");
        if (vault) {
          collVault = vault;
          sources.push({ nodeId: sourceNode.id, label: `Deposit ${vault.asset.symbol}`, amount: amt });
        }
      }
    }

    const total = sources.reduce((sum, s) => sum + s.amount, 0);
    return { collateralVault: collVault, connectedAmount: total, collateralSources: sources };
  }, [edges, nodes, id]);

  // Reset when collateral changes
  const prevCollateralRef = useRef<string | null>(null);
  useEffect(() => {
    const currentAddr = collateralVault?.address ?? null;
    if (prevCollateralRef.current !== null && currentAddr !== prevCollateralRef.current) {
      updateNodeData(id, { vault: null, borrowAmount: 0, borrowAmountUsd: 0, healthFactor: null, ltvPercent: 50 });
    }
    prevCollateralRef.current = currentAddr;
  }, [collateralVault?.address]);

  // Filter borrow vaults: exclude collateral vault
  const borrowVaults = useMemo(() => {
    if (!collateralVault) return vaults;
    return vaults.filter((v) => v.address !== collateralVault.address);
  }, [vaults, collateralVault]);

  // Live borrow vault data
  const selectedBorrowVault = useMemo(() => {
    if (!d.vault) return null;
    return vaults.find((v) => v.address === d.vault!.address) ?? null;
  }, [d.vault, vaults]);

  // Available liquidity
  const availableLiquidity = useMemo(() => {
    if (!selectedBorrowVault) return 0n;
    const available = selectedBorrowVault.totalAssets - selectedBorrowVault.totalBorrows;
    return available > 0n ? available : 0n;
  }, [selectedBorrowVault]);

  const availableLiquidityNum = selectedBorrowVault
    ? Number(availableLiquidity) / 10 ** selectedBorrowVault.assetDecimals
    : 0;

  // Calculate borrow amount from LTV (simplified: assumes 1:1 price)
  const borrowAmount = useMemo(() => {
    if (!connectedAmount || !d.ltvPercent) return 0;
    return (connectedAmount * d.ltvPercent) / 100;
  }, [connectedAmount, d.ltvPercent]);

  // Health factor
  const healthFactor = useMemo(() => {
    if (d.ltvPercent === 0) return null;
    return 100 / d.ltvPercent;
  }, [d.ltvPercent]);

  const exceedsLiquidity = borrowAmount > 0 && borrowAmount > availableLiquidityNum;

  // Persist computed values
  useEffect(() => {
    updateNodeData(id, { borrowAmount, healthFactor });
  }, [borrowAmount, healthFactor]);

  const hfColor = (hf: number | null) => {
    if (hf === null) return "#586878";
    if (hf > 2) return "#02c77b";
    if (hf > 1.2) return "#eab308";
    return "#eb365a";
  };

  const vaultOptions = useMemo(
    () => borrowVaults.map((v) => ({
      value: v.address,
      label: `${v.assetSymbol} -- ${v.name} -- ${formatPercent(v.borrowAPY)} Borrow`,
    })),
    [borrowVaults]
  );

  const handleVaultChange = useCallback((addr: string) => {
    const vault = vaults.find((v) => v.address === addr);
    if (!vault) return;
    const vaultInfo: EulerVaultInfo = {
      address: vault.address,
      name: vault.name,
      symbol: vault.symbol,
      asset: { address: vault.asset, symbol: vault.assetSymbol, name: vault.assetName, decimals: vault.assetDecimals },
      totalAssets: vault.totalAssets,
      totalBorrows: vault.totalBorrows,
      supplyAPY: vault.supplyAPY,
      borrowAPY: vault.borrowAPY,
      utilization: vault.utilization,
    };
    updateNodeData(id, { vault: vaultInfo, collateralVault, borrowAmount: 0, borrowAmountUsd: 0 });
  }, [vaults, collateralVault, id, updateNodeData]);

  return (
    <NodeShell
      nodeType="eulerBorrow"
      title="Euler Borrow"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsLiquidity}
      loading={vaultsLoading}
    >
      <div className="space-y-2">
        {/* No connection hint */}
        {!collateralVault && (
          <div className="rounded-lg border px-2 py-1.5 text-[10px]" style={{ borderColor: "rgba(255,255,255,0.08)", backgroundColor: "#0a121c", color: "#586878" }}>
            Connect an Euler Deposit node to see borrow options
          </div>
        )}

        {/* Collateral info */}
        {collateralVault && (
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Collateral</span>
              <span className="text-xs font-medium" style={{ color: "#e2e8f0" }}>
                {connectedAmount.toFixed(4)} {collateralVault.asset.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Borrow vault selector */}
        {collateralVault && (
          <div>
            <label className="text-[10px]" style={{ color: "#586878" }}>Borrow Vault</label>
            <SearchSelect
              options={vaultOptions}
              value={d.vault?.address ?? ""}
              onChange={handleVaultChange}
              placeholder="Search vault..."
            />
          </div>
        )}

        {/* Borrow vault stats */}
        {selectedBorrowVault && (
          <div className="space-y-1 rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Borrow APY</span>
              <span className="text-[10px] font-medium" style={{ color: "#eb365a" }}>
                {formatPercent(selectedBorrowVault.borrowAPY)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Liquidity</span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {formatTokenAmount(availableLiquidity, selectedBorrowVault.assetDecimals)} {selectedBorrowVault.assetSymbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Utilization</span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {formatPercent(selectedBorrowVault.utilization)}
              </span>
            </div>
          </div>
        )}

        {/* LTV slider */}
        {selectedBorrowVault && collateralVault && (
          <div className="nodrag">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Target LTV</label>
              <div className="flex items-center gap-0.5">
                <input
                  type="number"
                  min={0}
                  max={MAX_LTV_SLIDER}
                  value={d.ltvPercent}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(MAX_LTV_SLIDER, parseInt(e.target.value) || 0));
                    updateNodeData(id, { ltvPercent: val });
                  }}
                  className="w-10 rounded px-1 py-0.5 text-right text-xs font-medium outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ backgroundColor: "#0a121c", color: "#e2e8f0" }}
                />
                <span className="text-xs" style={{ color: "#586878" }}>%</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={MAX_LTV_SLIDER}
              value={d.ltvPercent}
              onChange={(e) => updateNodeData(id, { ltvPercent: parseInt(e.target.value) })}
              className="mt-1 w-full"
              style={{ accentColor: "#39a699" }}
            />
            <div className="flex justify-between text-[9px]" style={{ color: "#586878" }}>
              <span>0%</span>
              <span>{MAX_LTV_SLIDER}% max</span>
            </div>
          </div>
        )}

        {/* Borrow amount + HF */}
        {selectedBorrowVault && collateralVault && d.ltvPercent > 0 && (
          <div
            className="flex items-center justify-between rounded-lg px-2 py-1.5"
            style={{
              backgroundColor: exceedsLiquidity ? "rgba(235,54,90,0.05)" : "#0a121c",
              borderColor: exceedsLiquidity ? "rgba(235,54,90,0.3)" : "transparent",
              borderWidth: exceedsLiquidity ? 1 : 0,
              borderStyle: "solid",
            }}
          >
            <div>
              <span className="text-[10px]" style={{ color: "#586878" }}>Borrow</span>
              <p className="text-xs font-medium" style={{ color: "#e2e8f0" }}>
                {borrowAmount > 0 ? `${borrowAmount.toFixed(4)} ${selectedBorrowVault.assetSymbol}` : "--"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px]" style={{ color: "#586878" }}>HF</span>
              <p className="text-xs font-semibold" style={{ color: hfColor(healthFactor) }}>
                {healthFactor ? healthFactor.toFixed(2) : "--"}
              </p>
            </div>
          </div>
        )}

        {/* Liquidity warning */}
        {exceedsLiquidity && selectedBorrowVault && (
          <div className="rounded-lg border px-2 py-1.5 text-[10px]" style={{ borderColor: "rgba(235,54,90,0.2)", backgroundColor: "rgba(235,54,90,0.05)", color: "#eb365a" }}>
            Insufficient liquidity -- only {availableLiquidityNum.toFixed(4)} {selectedBorrowVault.assetSymbol} available
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
