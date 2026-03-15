"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Handle, Position, useReactFlow, type NodeProps } from "@xyflow/react";
import { useAccount, useReadContracts } from "wagmi";
import { formatUnits } from "viem";
import { useAtalaVaults, type AtalaVaultData } from "@/hooks/useAtalaVaults";
import { atalaVaultAbi } from "@/config/atala";
import type { AtalaWithdrawNodeData, AtalaPosition, AtalaVaultInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

function toVaultInfo(v: AtalaVaultData): AtalaVaultInfo {
  return {
    address: v.address,
    name: v.name,
    symbol: v.symbol,
    asset: { address: v.asset, symbol: v.assetSymbol, name: v.assetSymbol, decimals: v.assetDecimals },
    totalAssets: v.totalAssets,
    idle: v.idle,
  };
}

function AtalaWithdrawNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as AtalaWithdrawNodeData;
  const { updateNodeData, deleteElements } = useReactFlow();
  const { address } = useAccount();
  const { vaults, isLoading: vaultsLoading } = useAtalaVaults(address);
  const [percentage, setPercentage] = useState(0);

  const selectedVaultAddress = d.position?.vault.address as `0x${string}` | undefined;

  // Read on-chain position data
  const { data: positionData, isLoading: positionLoading } = useReadContracts({
    contracts: selectedVaultAddress && address
      ? [
          { address: selectedVaultAddress, abi: atalaVaultAbi, functionName: "balanceOf", args: [address] },
          { address: selectedVaultAddress, abi: atalaVaultAbi, functionName: "totalSupply" },
          { address: selectedVaultAddress, abi: atalaVaultAbi, functionName: "totalAssets" },
        ]
      : [],
    query: { enabled: !!selectedVaultAddress && !!address, staleTime: 15_000 },
  });

  const userShares = positionData?.[0]?.status === "success" ? (positionData[0].result as bigint) : 0n;
  const totalSupply = positionData?.[1]?.status === "success" ? (positionData[1].result as bigint) : 0n;
  const totalAssets = positionData?.[2]?.status === "success" ? (positionData[2].result as bigint) : 0n;
  const userAssets = userShares > 0n && totalSupply > 0n ? (userShares * totalAssets) / totalSupply : 0n;

  const decimals = d.position?.vault.asset.decimals ?? 18;
  const formattedAssets = formatUnits(userAssets, decimals);
  const userAssetsNum = parseFloat(formattedAssets);

  // Sync position data
  useEffect(() => {
    if (!d.position) return;
    if (d.position.shares !== userShares || d.position.assets !== userAssets) {
      updateNodeData(id, { position: { ...d.position, shares: userShares, assets: userAssets } });
    }
  }, [userShares, userAssets, d.position]);

  const currentAmount = parseFloat(d.amount || "0");
  const exceedsBalance = currentAmount > 0 && userAssetsNum > 0 && currentAmount > userAssetsNum;

  const handlePercentage = useCallback((pct: number) => {
    setPercentage(pct);
    if (userAssets === 0n) return;
    const withdrawAssets = (userAssets * BigInt(pct)) / 100n;
    updateNodeData(id, { amount: formatUnits(withdrawAssets, decimals) });
  }, [userAssets, decimals, id, updateNodeData]);

  const vaultOptions = useMemo(
    () => vaults.map((v) => ({
      value: v.address,
      label: `${v.name} (${v.assetSymbol})`,
    })),
    [vaults]
  );

  return (
    <NodeShell
      nodeType="atalaWithdraw"
      title="Atala Withdraw"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={vaultsLoading || positionLoading}
    >
      <div className="space-y-2">
        {/* Vault selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Vault Position</label>
          <SearchSelect
            options={vaultOptions}
            value={d.position?.vault.address ?? ""}
            onChange={(addr) => {
              const vault = vaults.find((v) => v.address === addr);
              if (!vault) return;
              const pos: AtalaPosition = { vault: toVaultInfo(vault), shares: 0n, assets: 0n };
              updateNodeData(id, { position: pos, amount: "" });
              setPercentage(0);
            }}
            placeholder="Search vault..."
          />
        </div>

        {/* Position info */}
        {d.position && (
          <div className="space-y-1 rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Asset</span>
              <span className="text-xs" style={{ color: "#e2e8f0" }}>
                {d.position.vault.asset.symbol}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Shares</span>
              <span className="font-mono text-[10px]" style={{ color: "#8898a8" }}>
                {formatUnits(userShares, decimals).slice(0, 12)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Balance</span>
              <span className="font-mono text-xs" style={{ color: "#e2e8f0" }}>
                {formattedAssets.slice(0, 12)} {d.position.vault.asset.symbol}
              </span>
            </div>
          </div>
        )}

        {/* Percentage presets */}
        {d.position && (
          <div className="flex items-center gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => handlePercentage(pct)}
                className="flex-1 rounded py-1 text-[10px] font-medium transition-colors"
                style={{
                  backgroundColor: percentage === pct ? "#f97316" : "rgba(255,255,255,0.05)",
                  color: percentage === pct ? "white" : "#8898a8",
                }}
              >
                {pct === 100 ? "MAX" : `${pct}%`}
              </button>
            ))}
          </div>
        )}

        {/* Slider */}
        {d.position && (
          <div className="nodrag">
            <input
              type="range"
              min={0}
              max={100}
              value={percentage}
              onChange={(e) => handlePercentage(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: "#f97316" }}
            />
            <div className="mt-0.5 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>0%</span>
              <span className="text-[10px] font-medium" style={{ color: "#f97316" }}>{percentage}%</span>
              <span className="text-[10px]" style={{ color: "#586878" }}>100%</span>
            </div>
          </div>
        )}

        {/* Amount input */}
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-[10px]" style={{ color: "#586878" }}>Amount</label>
            <button
              onClick={() => handlePercentage(100)}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ backgroundColor: "rgba(249,115,22,0.1)", color: "#f97316" }}
            >
              MAX
            </button>
          </div>
          <div
            className="nodrag flex items-center gap-2 rounded-lg border px-2.5 py-1.5"
            style={{
              backgroundColor: "#0a121c",
              borderColor: exceedsBalance ? "#eb365a" : "rgba(255,255,255,0.08)",
            }}
          >
            <input
              type="number"
              placeholder="0.00"
              value={d.amount}
              onChange={(e) => {
                updateNodeData(id, { amount: e.target.value });
                setPercentage(0);
              }}
              className="w-full bg-transparent font-mono text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              style={{ color: "#e2e8f0" }}
            />
            <span className="text-xs" style={{ color: "#586878" }}>
              {d.position?.vault.asset.symbol ?? ""}
            </span>
          </div>
          {exceedsBalance && (
            <p className="mt-1 text-[10px]" style={{ color: "#eb365a" }}>
              Exceeds position balance
            </p>
          )}
        </div>
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

export default memo(AtalaWithdrawNodeComponent);
