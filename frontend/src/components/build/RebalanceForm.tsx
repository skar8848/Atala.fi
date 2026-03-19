"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { formatTokenAmount, parseTokenAmount, shortenAddress } from "@/lib/format";
import { useAtalaWrite } from "@/hooks/useAtalaWrite";
import { atalaVaultAbi } from "@/config/atala";
import type { SubVaultData } from "@/hooks/useAtalaVaultDetail";

interface RebalanceFormProps {
  vaultAddress: `0x${string}`;
  idle: bigint;
  subVaults: SubVaultData[];
  assetDecimals: number;
  assetSymbol: string;
  isAllocator: boolean;
}

interface DeltaEntry {
  vault: `0x${string}`;
  delta: string; // user input (positive = deposit, negative = withdraw)
}

export function RebalanceForm({
  vaultAddress,
  idle,
  subVaults,
  assetDecimals,
  assetSymbol,
  isAllocator,
}: RebalanceFormProps) {
  const [deltas, setDeltas] = useState<DeltaEntry[]>(
    subVaults.map((sv) => ({ vault: sv.address, delta: "" }))
  );
  const { writeContract, isPending, isConfirming } = useAtalaWrite();

  function updateDelta(index: number, value: string) {
    setDeltas((prev) => prev.map((d, i) => (i === index ? { ...d, delta: value } : d)));
  }

  // Compute net deposit (positive deltas only) to validate against idle
  const netDeposit = deltas.reduce((sum, d) => {
    const num = parseFloat(d.delta);
    if (!isNaN(num) && num > 0) {
      return sum + parseTokenAmount(d.delta, assetDecimals);
    }
    return sum;
  }, 0n);

  const exceedsIdle = netDeposit > idle;

  function handleRebalance() {
    const allocations = deltas
      .filter((d) => d.delta.trim() && parseFloat(d.delta) !== 0)
      .map((d) => {
        const num = parseFloat(d.delta);
        const raw = parseTokenAmount(d.delta.replace("-", ""), assetDecimals);
        return {
          vault: d.vault,
          delta: num < 0 ? -raw : raw,
        };
      });

    if (allocations.length === 0) return;

    writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: "reallocate",
      args: [allocations],
    });
  }

  if (subVaults.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Add sub-vaults first before rebalancing
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-muted/30 border border-border/30 p-3 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Available Idle</span>
        <span className="text-sm font-mono font-medium">
          {formatTokenAmount(idle, assetDecimals)} {assetSymbol}
        </span>
      </div>

      <div className="space-y-2">
        {subVaults.map((sv, i) => (
          <div
            key={sv.address}
            className="flex items-center gap-3 rounded-lg border border-border/30 p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{sv.name}</p>
              <p className="text-[10px] font-mono text-muted-foreground">
                {shortenAddress(sv.address)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Current: {formatTokenAmount(sv.allocation, assetDecimals)} {assetSymbol}
              </p>
            </div>
            <div className="w-32">
              <Input
                value={deltas[i]?.delta ?? ""}
                onChange={(e) => updateDelta(i, e.target.value)}
                placeholder="0"
                className="text-right text-sm h-8"
                disabled={!isAllocator}
              />
              <p className="text-[10px] text-muted-foreground text-right mt-0.5">
                + deposit / - withdraw
              </p>
            </div>
          </div>
        ))}
      </div>

      {exceedsIdle && (
        <p className="text-xs text-destructive">
          Total deposits ({formatTokenAmount(netDeposit, assetDecimals)} {assetSymbol}) exceed idle balance
        </p>
      )}

      {isAllocator && (
        <Button
          onClick={handleRebalance}
          disabled={exceedsIdle || isPending || isConfirming || deltas.every((d) => !d.delta.trim())}
          className="w-full bg-atala hover:bg-atala/80 text-white"
        >
          {isPending ? (
            <>
              <Spinner className="mr-2" />
              Confirm in Wallet...
            </>
          ) : isConfirming ? (
            <>
              <Spinner className="mr-2" />
              Executing...
            </>
          ) : (
            "Execute Rebalance"
          )}
        </Button>
      )}
    </div>
  );
}
