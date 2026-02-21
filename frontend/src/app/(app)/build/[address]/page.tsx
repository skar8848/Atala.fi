"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAtalaVaultDetail } from "@/hooks/useAtalaVaultDetail";
import { useAtalaWrite } from "@/hooks/useAtalaWrite";
import { atalaVaultAbi } from "@/config/atala";
import { SubVaultList } from "@/components/build/SubVaultList";
import { AddSubVaultDrawer } from "@/components/build/AddSubVaultDrawer";
import { RoleManager } from "@/components/build/RoleManager";
import { RebalanceForm } from "@/components/build/RebalanceForm";
import { TokenIcon } from "@/components/markets/VaultTable";
import { formatTokenAmount, formatIdleRatio, shortenAddress } from "@/lib/format";
import Link from "next/link";

export default function VaultManagementPage() {
  const params = useParams();
  const vaultAddress = params.address as `0x${string}`;
  const { address: userAddress, isConnected } = useAccount();
  const { vault, isLoading, refetch } = useAtalaVaultDetail(vaultAddress);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Queue management
  const [editingSupplyQueue, setEditingSupplyQueue] = useState(false);
  const [editingWithdrawQueue, setEditingWithdrawQueue] = useState(false);
  const [supplyQueueDraft, setSupplyQueueDraft] = useState<`0x${string}`[]>([]);
  const [withdrawQueueDraft, setWithdrawQueueDraft] = useState<`0x${string}`[]>([]);
  const setSupplyQueueWrite = useAtalaWrite();
  const setWithdrawQueueWrite = useAtalaWrite();

  function copyAddress() {
    navigator.clipboard.writeText(vaultAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function moveInQueue(
    queue: `0x${string}`[],
    setQueue: (q: `0x${string}`[]) => void,
    index: number,
    direction: -1 | 1
  ) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= queue.length) return;
    const copy = [...queue];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    setQueue(copy);
  }

  function saveSupplyQueue() {
    setSupplyQueueWrite.writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: "setSupplyQueue",
      args: [supplyQueueDraft],
    });
    setEditingSupplyQueue(false);
  }

  function saveWithdrawQueue() {
    setWithdrawQueueWrite.writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: "setWithdrawQueue",
      args: [withdrawQueueDraft],
    });
    setEditingWithdrawQueue(false);
  }

  // Permission checks
  const isOwner = userAddress?.toLowerCase() === vault?.owner?.toLowerCase();
  const isCurator =
    isOwner || userAddress?.toLowerCase() === vault?.curator?.toLowerCase();
  const isAllocator =
    isCurator || userAddress?.toLowerCase() === vault?.allocator?.toLowerCase();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="mr-2" />
        <span className="text-sm text-muted-foreground">Loading vault...</span>
      </div>
    );
  }

  if (!vault) {
    return (
      <div className="space-y-6">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-muted-foreground">
              Vault not found or unable to read contract data
            </p>
            <Link href="/build" className="text-cyan-400 hover:underline text-sm">
              Back to Build
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper to find sub-vault name by address (for queue display)
  function subVaultName(addr: `0x${string}`): string {
    const sv = vault!.subVaults.find(
      (s) => s.address.toLowerCase() === addr.toLowerCase()
    );
    return sv?.name ?? shortenAddress(addr);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link
          href="/build"
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-border/40 hover:bg-muted transition-colors mt-1"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight truncate">
              {vault.name}
            </h1>
            <TokenIcon symbol={vault.assetSymbol} size="sm" />
            <Badge variant="secondary">{vault.assetSymbol}</Badge>
          </div>
          <button
            onClick={copyAddress}
            className="flex items-center gap-1.5 mt-1 group"
          >
            <span className="text-xs font-mono text-muted-foreground">
              {shortenAddress(vaultAddress, 6)}
            </span>
            {copied ? (
              <span className="text-[10px] text-emerald-400">Copied!</span>
            ) : (
              <svg
                className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                <path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5h2" />
              </svg>
            )}
          </button>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground">Total Assets</p>
            <p className="text-lg font-mono font-semibold mt-1">
              {formatTokenAmount(vault.totalAssets, vault.assetDecimals)}
            </p>
            <p className="text-[10px] text-muted-foreground">{vault.assetSymbol}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground">Idle</p>
            <p className="text-lg font-mono font-semibold mt-1">
              {formatTokenAmount(vault.idle, vault.assetDecimals)}
            </p>
            <p className="text-[10px] text-muted-foreground">{vault.assetSymbol}</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground">Sub-vaults</p>
            <p className="text-lg font-semibold mt-1">{vault.subVaults.length}</p>
            <p className="text-[10px] text-muted-foreground">configured</p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground">Idle Ratio</p>
            <p className="text-lg font-mono font-semibold mt-1">
              {formatIdleRatio(vault.idle, vault.totalAssets)}
            </p>
            <p className="text-[10px] text-muted-foreground">unallocated</p>
          </CardContent>
        </Card>
      </div>

      {/* Roles */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <RoleManager
            vaultAddress={vaultAddress}
            roles={{
              owner: vault.owner,
              curator: vault.curator,
              allocator: vault.allocator,
              sentinel: vault.sentinel,
            }}
            isOwner={isOwner}
          />
        </CardContent>
      </Card>

      {/* Sub-vaults */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sub-Vaults</CardTitle>
        </CardHeader>
        <CardContent>
          <SubVaultList
            vaultAddress={vaultAddress}
            subVaults={vault.subVaults}
            assetDecimals={vault.assetDecimals}
            assetSymbol={vault.assetSymbol}
            isOwnerOrCurator={isCurator}
            onAddClick={() => setDrawerOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Supply Queue */}
      {vault.subVaults.length > 0 && (
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Supply Queue</CardTitle>
            {isAllocator && !editingSupplyQueue && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setEditingSupplyQueue(true);
                  setSupplyQueueDraft([...vault.supplyQueue]);
                }}
              >
                Edit Order
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <QueueList
              queue={editingSupplyQueue ? supplyQueueDraft : vault.supplyQueue}
              getName={subVaultName}
              editing={editingSupplyQueue}
              onMove={(i, dir) =>
                moveInQueue(supplyQueueDraft, setSupplyQueueDraft, i, dir)
              }
            />
            {editingSupplyQueue && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={saveSupplyQueue}
                  disabled={setSupplyQueueWrite.isPending || setSupplyQueueWrite.isConfirming}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {setSupplyQueueWrite.isPending || setSupplyQueueWrite.isConfirming ? (
                    <><Spinner className="mr-1 size-3" />Saving...</>
                  ) : "Save Order"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingSupplyQueue(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Withdraw Queue */}
      {vault.subVaults.length > 0 && (
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Withdraw Queue</CardTitle>
            {isAllocator && !editingWithdrawQueue && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  setEditingWithdrawQueue(true);
                  setWithdrawQueueDraft([...vault.withdrawQueue]);
                }}
              >
                Edit Order
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <QueueList
              queue={editingWithdrawQueue ? withdrawQueueDraft : vault.withdrawQueue}
              getName={subVaultName}
              editing={editingWithdrawQueue}
              onMove={(i, dir) =>
                moveInQueue(withdrawQueueDraft, setWithdrawQueueDraft, i, dir)
              }
            />
            {editingWithdrawQueue && (
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={saveWithdrawQueue}
                  disabled={setWithdrawQueueWrite.isPending || setWithdrawQueueWrite.isConfirming}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {setWithdrawQueueWrite.isPending || setWithdrawQueueWrite.isConfirming ? (
                    <><Spinner className="mr-1 size-3" />Saving...</>
                  ) : "Save Order"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingWithdrawQueue(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rebalance */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rebalance</CardTitle>
        </CardHeader>
        <CardContent>
          <RebalanceForm
            vaultAddress={vaultAddress}
            idle={vault.idle}
            subVaults={vault.subVaults}
            assetDecimals={vault.assetDecimals}
            assetSymbol={vault.assetSymbol}
            isAllocator={isAllocator}
          />
        </CardContent>
      </Card>

      {/* Add Sub-Vault Drawer */}
      <AddSubVaultDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        vaultAddress={vaultAddress}
        assetAddress={vault.asset}
        assetSymbol={vault.assetSymbol}
        assetDecimals={vault.assetDecimals}
        existingSubVaults={vault.subVaults.map((s) => s.address)}
      />
    </div>
  );
}

// Queue display component
function QueueList({
  queue,
  getName,
  editing,
  onMove,
}: {
  queue: `0x${string}`[];
  getName: (addr: `0x${string}`) => string;
  editing: boolean;
  onMove: (index: number, direction: -1 | 1) => void;
}) {
  if (queue.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Queue is empty
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {queue.map((addr, i) => (
        <div
          key={`${addr}-${i}`}
          className="flex items-center gap-2 rounded-lg border border-border/30 p-2"
        >
          <span className="text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{getName(addr)}</p>
            <p className="text-[10px] font-mono text-muted-foreground">
              {shortenAddress(addr)}
            </p>
          </div>
          {editing && (
            <div className="flex gap-0.5">
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onMove(i, -1)}
                disabled={i === 0}
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 10l5-5 5 5" />
                </svg>
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => onMove(i, 1)}
                disabled={i === queue.length - 1}
              >
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6l5 5 5-5" />
                </svg>
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
