"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { useEulerVaults, type VaultData } from "@/hooks/useEulerVaults";
import { ALL_VAULT_ADDRESSES } from "@/hooks/useVaultDiscovery";
import { formatPercent, formatTokenAmount, parseTokenAmount } from "@/lib/format";
import type { EulerDepositNodeData, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

interface UpstreamInput {
  nodeId: string;
  label: string;
  amount: number;
  type: "wallet" | "swap" | "eulerWithdraw" | "siloWithdraw" | "atalaWithdraw";
}

function EulerDepositNodeComponent({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const d = data as unknown as EulerDepositNodeData;
  const edges = useEdges();
  const allNodes = useNodes();
  const { address } = useAccount();
  const { vaults, isLoading: vaultsLoading } = useEulerVaults(ALL_VAULT_ADDRESSES);

  // Detect upstream inputs and suggested asset
  const { upstreamInputs, suggestedAsset } = useMemo(() => {
    const incomingEdges = edges.filter((e) => e.target === id);
    const inputs: UpstreamInput[] = [];
    let suggested: string | null = null;

    for (const edge of incomingEdges) {
      const sourceNode = allNodes.find((n) => n.id === edge.source);
      if (!sourceNode) continue;
      const sd = sourceNode.data as Record<string, unknown>;

      if (sd.type === "swap") {
        const tokenOut = sd.tokenOut as TokenInfo | null;
        const quoteOut = parseFloat((sd.quoteOut as string) || "0");
        if (tokenOut) {
          suggested = tokenOut.address.toLowerCase();
          inputs.push({ nodeId: sourceNode.id, label: `Swap -> ${tokenOut.symbol}`, amount: quoteOut, type: "swap" });
        }
      } else if (sd.type === "wallet") {
        inputs.push({ nodeId: sourceNode.id, label: "Wallet", amount: 0, type: "wallet" });
      } else if (sd.type === "eulerWithdraw" || sd.type === "siloWithdraw" || sd.type === "atalaWithdraw") {
        const position = sd.position as { vault?: { asset?: TokenInfo }; pair?: { token0?: TokenInfo; token1?: TokenInfo }; side?: 0 | 1 } | null;
        const amt = parseFloat((sd.amount as string) || "0");
        let assetInfo: TokenInfo | null = null;
        if (sd.type === "eulerWithdraw" || sd.type === "atalaWithdraw") {
          assetInfo = position?.vault?.asset ?? null;
        } else {
          const side = (position as { side?: 0 | 1 })?.side ?? 0;
          const pair = sd.position as { pair: { token0: TokenInfo; token1: TokenInfo } } | null;
          assetInfo = side === 0 ? pair?.pair.token0 ?? null : pair?.pair.token1 ?? null;
        }
        if (assetInfo) {
          suggested = assetInfo.address.toLowerCase();
          inputs.push({ nodeId: sourceNode.id, label: `Withdraw ${assetInfo.symbol}`, amount: amt, type: sd.type as "eulerWithdraw" });
        }
      } else if (sd.type === "eulerBorrow" || sd.type === "siloBorrow") {
        const borrowAmt = (sd.borrowAmount as number) ?? 0;
        const borrowVault = sd.borrowVault as { asset?: TokenInfo | { address: string; symbol: string } } | null;
        const pair = sd.pair as { token0?: TokenInfo; token1?: TokenInfo } | null;
        const side = sd.side as 0 | 1 | undefined;
        let sym = "?";
        let addr: string | null = null;
        if (sd.type === "eulerBorrow" && borrowVault?.asset) {
          const a = borrowVault.asset as TokenInfo;
          sym = a.symbol;
          addr = a.address?.toLowerCase() ?? null;
        } else if (sd.type === "siloBorrow" && pair) {
          const token = (side ?? 0) === 0 ? pair.token0 : pair.token1;
          if (token) { sym = token.symbol; addr = token.address.toLowerCase(); }
        }
        if (addr) suggested = addr;
        inputs.push({ nodeId: sourceNode.id, label: `Borrow ${sym}`, amount: borrowAmt, type: "swap" });
      }
    }

    return { upstreamInputs: inputs, suggestedAsset: suggested };
  }, [edges, allNodes, id]);

  // Auto-select vault when upstream suggests an asset
  const prevSuggestedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!suggestedAsset) { prevSuggestedRef.current = null; return; }
    if (suggestedAsset !== prevSuggestedRef.current) {
      prevSuggestedRef.current = suggestedAsset;
      // Auto-select first vault matching the upstream asset
      const matchingVault = vaults.find((v) => v.asset.toLowerCase() === suggestedAsset);
      if (matchingVault) {
        const vaultInfo = {
          address: matchingVault.address,
          name: matchingVault.name,
          symbol: matchingVault.symbol,
          asset: { address: matchingVault.asset, symbol: matchingVault.assetSymbol, name: matchingVault.assetName, decimals: matchingVault.assetDecimals },
          totalAssets: matchingVault.totalAssets,
          totalBorrows: matchingVault.totalBorrows,
          supplyAPY: matchingVault.supplyAPY,
          borrowAPY: matchingVault.borrowAPY,
          utilization: matchingVault.utilization,
        };
        updateNodeData(id, { vault: vaultInfo });
      }
    }
  }, [suggestedAsset, vaults]);

  // Selected vault with live data
  const selectedVault = useMemo(() => {
    if (!d.vault) return null;
    return vaults.find((v) => v.address === d.vault!.address) ?? null;
  }, [d.vault, vaults]);

  // Filter vaults by upstream asset if present
  const filteredVaults = useMemo(() => {
    if (!suggestedAsset) return vaults;
    return vaults.filter((v) => v.asset.toLowerCase() === suggestedAsset);
  }, [vaults, suggestedAsset]);

  // Read wallet balance for selected asset
  const balanceContracts = useMemo(() => {
    if (!address || !selectedVault) return [];
    return [{
      address: selectedVault.asset as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    }];
  }, [address, selectedVault]);

  const { data: balanceData } = useReadContracts({
    contracts: balanceContracts.length > 0 ? balanceContracts : undefined,
    query: { enabled: balanceContracts.length > 0, refetchInterval: 15_000 },
  });

  const walletBalance = useMemo(() => {
    if (!balanceData?.[0] || balanceData[0].status !== "success") return 0n;
    return balanceData[0].result as bigint;
  }, [balanceData]);

  const walletBalanceNum = selectedVault
    ? Number(walletBalance) / 10 ** selectedVault.assetDecimals
    : 0;

  // Compute total available from all upstream inputs
  const totalAvailable = useMemo(() => {
    if (upstreamInputs.length === 0) return walletBalanceNum;
    const inputsWithBalance = upstreamInputs.map((i) =>
      i.type === "wallet" ? { ...i, amount: walletBalanceNum } : i
    );
    return inputsWithBalance.reduce((sum, i) => sum + i.amount, 0);
  }, [upstreamInputs, walletBalanceNum]);

  const currentAmount = parseFloat(d.amount || "0");
  const exceedsBalance = currentAmount > 0 && totalAvailable > 0 && currentAmount > totalAvailable;

  // Persist validation state
  const prevExceedsRef = useRef(false);
  useEffect(() => {
    if (exceedsBalance !== prevExceedsRef.current) {
      prevExceedsRef.current = exceedsBalance;
      updateNodeData(id, { exceedsBalance });
    }
  }, [exceedsBalance]);

  const vaultOptions = useMemo(
    () => filteredVaults.map((v) => ({
      value: v.address,
      label: `${v.assetSymbol} -- ${v.name} -- ${formatPercent(v.supplyAPY)} APY`,
    })),
    [filteredVaults]
  );

  const handleVaultChange = useCallback((addr: string) => {
    const vault = vaults.find((v) => v.address === addr);
    if (!vault) return;
    updateNodeData(id, {
      vault: {
        address: vault.address,
        name: vault.name,
        symbol: vault.symbol,
        asset: { address: vault.asset, symbol: vault.assetSymbol, name: vault.assetName, decimals: vault.assetDecimals },
        totalAssets: vault.totalAssets,
        totalBorrows: vault.totalBorrows,
        supplyAPY: vault.supplyAPY,
        borrowAPY: vault.borrowAPY,
        utilization: vault.utilization,
      },
      amount: "",
      amountUsd: 0,
    });
  }, [vaults, id, updateNodeData]);

  return (
    <NodeShell
      nodeType="eulerDeposit"
      title="Euler Deposit"
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={vaultsLoading}
    >
      <div className="space-y-2">
        {/* Vault selector */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>Vault</label>
          <SearchSelect
            options={vaultOptions}
            value={d.vault?.address ?? ""}
            onChange={handleVaultChange}
            placeholder="Search vault..."
          />
        </div>

        {/* Vault stats */}
        {selectedVault && (
          <div className="space-y-1 rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Supply APY</span>
              <span className="text-[10px] font-medium" style={{ color: "#02c77b" }}>
                {formatPercent(selectedVault.supplyAPY)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Utilization</span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {formatPercent(selectedVault.utilization)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#586878" }}>Total Supply</span>
              <span className="text-[10px]" style={{ color: "#8898a8" }}>
                {formatTokenAmount(selectedVault.totalAssets, selectedVault.assetDecimals)} {selectedVault.assetSymbol}
              </span>
            </div>
          </div>
        )}

        {/* Wallet balance */}
        {selectedVault && (
          <div className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: "#0a121c" }}>
            <span className="text-[10px]" style={{ color: "#586878" }}>Wallet</span>
            <span className="text-[10px]" style={{ color: "#8898a8" }}>
              {walletBalanceNum.toFixed(4)} {selectedVault.assetSymbol}
            </span>
          </div>
        )}

        {/* Amount input */}
        {selectedVault && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px]" style={{ color: "#586878" }}>Amount</label>
              {totalAvailable > 0 && (
                <button
                  type="button"
                  onClick={() => updateNodeData(id, { amount: totalAvailable.toFixed(6) })}
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
                borderColor: exceedsBalance ? "#eb365a" : "rgba(255,255,255,0.08)",
              }}
            >
              <input
                type="number"
                placeholder="0.00"
                className="min-w-0 flex-1 bg-transparent px-2 py-1.5 text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style={{ color: "#e2e8f0" }}
                value={d.amount}
                onChange={(e) => updateNodeData(id, { amount: e.target.value })}
              />
            </div>
            {exceedsBalance && (
              <p className="text-[10px]" style={{ color: "#eb365a" }}>
                Exceeds available balance ({totalAvailable.toFixed(4)} {selectedVault.assetSymbol})
              </p>
            )}
            {totalAvailable > 0 && (
              <div className="nodrag">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.min(100, totalAvailable > 0 ? Math.round((currentAmount / totalAvailable) * 100) : 0)}
                  onChange={(e) => {
                    const p = parseInt(e.target.value);
                    const amt = (totalAvailable * p) / 100;
                    updateNodeData(id, { amount: amt.toFixed(6) });
                  }}
                  className="w-full"
                  style={{ accentColor: "#55c3e9" }}
                />
                <div className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: "#0a121c" }}>
                  <span className="text-[10px]" style={{ color: "#586878" }}>
                    {currentAmount.toFixed(4)} {selectedVault.assetSymbol}
                  </span>
                  <span className="text-[10px]" style={{ color: "#586878" }}>
                    of {totalAvailable.toFixed(4)}
                  </span>
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
        style={{ borderColor: "#2973ff", backgroundColor: "#0c1218" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#2973ff", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(EulerDepositNodeComponent);
