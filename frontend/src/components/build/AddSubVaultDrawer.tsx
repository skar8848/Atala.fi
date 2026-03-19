"use client";

import { useState, useMemo } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { useEulerVaults, type VaultData } from "@/hooks/useEulerVaults";
import { useSiloMarkets, type SiloMarketData } from "@/hooks/useSiloMarkets";
import { ALL_VAULT_ADDRESSES } from "@/hooks/useVaultDiscovery";
import { useAtalaWrite } from "@/hooks/useAtalaWrite";
import { atalaVaultAbi } from "@/config/atala";
import { formatTokenAmount, formatPercent, shortenAddress, parseTokenAmount } from "@/lib/format";
type Protocol = "euler" | "silo";

/** Flattened Silo vault for display in the picker */
interface SiloVaultOption {
  address: `0x${string}`; // silo address (ERC-4626)
  pairLabel: string; // e.g. "WAVAX / USDC"
  side: string; // "silo0" | "silo1"
  supplyAPY: number;
  utilization: number;
  totalDeposits: bigint;
  decimals: number;
}

interface AddSubVaultDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vaultAddress: `0x${string}`;
  assetAddress: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  existingSubVaults: `0x${string}`[];
}

export function AddSubVaultDrawer({
  open,
  onOpenChange,
  vaultAddress,
  assetAddress,
  assetSymbol,
  assetDecimals,
  existingSubVaults,
}: AddSubVaultDrawerProps) {
  const [protocol, setProtocol] = useState<Protocol>("euler");
  const [selectedAddress, setSelectedAddress] = useState<`0x${string}` | null>(null);
  const [capInput, setCapInput] = useState("");
  const { writeContract, isPending, isConfirming } = useAtalaWrite();

  // Data sources
  const { vaults: allEulerVaults, isLoading: eulerLoading } = useEulerVaults(ALL_VAULT_ADDRESSES);
  const { markets: allSiloMarkets, isLoading: siloLoading } = useSiloMarkets();

  const existing = useMemo(
    () => new Set(existingSubVaults.map((a) => a.toLowerCase())),
    [existingSubVaults]
  );

  // Filter Euler V2 vaults by matching asset
  const compatibleEuler = useMemo(() => {
    return allEulerVaults.filter(
      (v) =>
        v.asset.toLowerCase() === assetAddress.toLowerCase() &&
        !existing.has(v.address.toLowerCase())
    );
  }, [allEulerVaults, assetAddress, existing]);

  // Filter Silo V2 silos by matching asset (each market has 2 silos)
  const compatibleSilo = useMemo(() => {
    const results: SiloVaultOption[] = [];
    for (const m of allSiloMarkets) {
      const pairLabel = `${m.token0Symbol} / ${m.token1Symbol}`;

      // Check silo0 (token0 side)
      if (
        m.token0.toLowerCase() === assetAddress.toLowerCase() &&
        !existing.has(m.silo0.toLowerCase())
      ) {
        results.push({
          address: m.silo0,
          pairLabel,
          side: "silo0",
          supplyAPY: m.supplyAPY0,
          utilization: m.utilization0,
          totalDeposits: m.totalDeposits0,
          decimals: m.token0Decimals,
        });
      }

      // Check silo1 (token1 side)
      if (
        m.token1.toLowerCase() === assetAddress.toLowerCase() &&
        !existing.has(m.silo1.toLowerCase())
      ) {
        results.push({
          address: m.silo1,
          pairLabel,
          side: "silo1",
          supplyAPY: m.supplyAPY1,
          utilization: m.utilization1,
          totalDeposits: m.totalDeposits1,
          decimals: m.token1Decimals,
        });
      }
    }
    return results;
  }, [allSiloMarkets, assetAddress, existing]);

  const eulerCount = compatibleEuler.length;
  const siloCount = compatibleSilo.length;

  function handleAdd() {
    if (!selectedAddress) return;
    const rawCap = parseTokenAmount(capInput, assetDecimals);
    writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: "addVault",
      args: [selectedAddress, rawCap],
    });
    onOpenChange(false);
    setSelectedAddress(null);
    setCapInput("");
  }

  function handleReset() {
    setSelectedAddress(null);
    setCapInput("");
  }

  return (
    <Drawer open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) handleReset(); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add Sub-Vault</DrawerTitle>
          <DrawerDescription>
            Select a vault with <Badge variant="secondary" className="text-[10px] mx-1">{assetSymbol}</Badge> as underlying asset
          </DrawerDescription>
        </DrawerHeader>

        {/* Protocol tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {(
              [
                { key: "euler" as Protocol, label: "Euler V2", count: eulerCount },
                { key: "silo" as Protocol, label: "Silo V2", count: siloCount },
              ] as const
            ).map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => { setProtocol(key); setSelectedAddress(null); }}
                className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  protocol === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className="ml-1 text-[10px] text-muted-foreground">({count})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 space-y-4 max-h-[50vh] overflow-y-auto">
          {/* Euler V2 tab */}
          {protocol === "euler" && (
            eulerLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <span className="text-sm text-muted-foreground">Loading Euler V2 vaults...</span>
              </div>
            ) : compatibleEuler.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No compatible Euler V2 vaults found for {assetSymbol}
              </p>
            ) : (
              <div className="space-y-2">
                {compatibleEuler.map((v) => (
                  <button
                    key={v.address}
                    onClick={() => setSelectedAddress(v.address)}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-atala/50 ${
                      selectedAddress === v.address
                        ? "border-atala bg-atala/10"
                        : "border-border/40"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{v.name}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {shortenAddress(v.address)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-emerald-400">
                        {formatPercent(v.supplyAPY)} APY
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatPercent(v.utilization)} util
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Silo V2 tab */}
          {protocol === "silo" && (
            siloLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="mr-2" />
                <span className="text-sm text-muted-foreground">Loading Silo V2 markets...</span>
              </div>
            ) : compatibleSilo.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No compatible Silo V2 vaults found for {assetSymbol}
              </p>
            ) : (
              <div className="space-y-2">
                {compatibleSilo.map((s) => (
                  <button
                    key={s.address}
                    onClick={() => setSelectedAddress(s.address)}
                    className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all hover:border-atala/50 ${
                      selectedAddress === s.address
                        ? "border-atala bg-atala/10"
                        : "border-border/40"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{s.pairLabel}</p>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">{s.side}</Badge>
                      </div>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {shortenAddress(s.address)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-mono text-emerald-400">
                        {formatPercent(s.supplyAPY)} APY
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatPercent(s.utilization)} util
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {/* Cap input (shown when a vault is selected) */}
          {selectedAddress && (
            <div className="space-y-2 pt-2 border-t border-border/30">
              <label className="text-sm font-medium block">
                Cap ({assetSymbol})
              </label>
              <Input
                value={capInput}
                onChange={(e) => setCapInput(e.target.value)}
                placeholder="e.g., 10000"
                type="text"
              />
              <p className="text-[10px] text-muted-foreground">
                Maximum amount of {assetSymbol} to allocate to this sub-vault
              </p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button
            onClick={handleAdd}
            disabled={!selectedAddress || !capInput.trim() || isPending || isConfirming}
            className="bg-atala hover:bg-atala/80 text-white"
          >
            {isPending || isConfirming ? (
              <>
                <Spinner className="mr-2" />
                Adding...
              </>
            ) : (
              "Add Sub-Vault"
            )}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
