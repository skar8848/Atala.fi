"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { formatTokenAmount, shortenAddress, parseTokenAmount } from "@/lib/format";
import { useAtalaWrite } from "@/hooks/useAtalaWrite";
import { atalaVaultAbi } from "@/config/atala";
import type { SubVaultData } from "@/hooks/useAtalaVaultDetail";

interface SubVaultListProps {
  vaultAddress: `0x${string}`;
  subVaults: SubVaultData[];
  assetDecimals: number;
  assetSymbol: string;
  isOwnerOrCurator: boolean;
  onAddClick: () => void;
}

export function SubVaultList({
  vaultAddress,
  subVaults,
  assetDecimals,
  assetSymbol,
  isOwnerOrCurator,
  onAddClick,
}: SubVaultListProps) {
  const [editingCap, setEditingCap] = useState<string | null>(null);
  const [capInput, setCapInput] = useState("");
  const setCap = useAtalaWrite();
  const removeVault = useAtalaWrite();

  function handleSetCap(subVault: `0x${string}`) {
    const rawCap = parseTokenAmount(capInput, assetDecimals);
    setCap.writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: "setCap",
      args: [subVault, rawCap],
    });
    setEditingCap(null);
    setCapInput("");
  }

  function handleRemove(subVault: `0x${string}`) {
    removeVault.writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: "removeVault",
      args: [subVault],
    });
  }

  if (subVaults.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-3">
        <p className="text-sm text-muted-foreground">No sub-vaults configured</p>
        {isOwnerOrCurator && (
          <Button variant="outline" size="sm" onClick={onAddClick}>
            Add Sub-Vault
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border/30 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead>Vault</TableHead>
              <TableHead className="text-right">Cap</TableHead>
              <TableHead className="text-right">Allocated</TableHead>
              <TableHead className="text-right">Status</TableHead>
              {isOwnerOrCurator && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {subVaults.map((sv) => (
              <TableRow key={sv.address} className="border-border/30">
                <TableCell>
                  <div className="font-medium text-sm">{sv.name}</div>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {shortenAddress(sv.address)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  {editingCap === sv.address ? (
                    <div className="flex items-center gap-1.5 justify-end">
                      <Input
                        value={capInput}
                        onChange={(e) => setCapInput(e.target.value)}
                        placeholder="0"
                        className="w-24 h-7 text-xs text-right"
                      />
                      <Button
                        size="xs"
                        onClick={() => handleSetCap(sv.address)}
                        disabled={setCap.isPending || setCap.isConfirming}
                        className="bg-cyan-500 hover:bg-cyan-600 text-white"
                      >
                        {setCap.isPending || setCap.isConfirming ? <Spinner className="size-3" /> : "Set"}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => { setEditingCap(null); setCapInput(""); }}
                      >
                        X
                      </Button>
                    </div>
                  ) : (
                    <span className="font-mono text-sm">
                      {formatTokenAmount(sv.cap, assetDecimals)} {assetSymbol}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatTokenAmount(sv.allocation, assetDecimals)} {assetSymbol}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={sv.enabled ? "secondary" : "destructive"} className="text-[10px]">
                    {sv.enabled ? "Active" : "Disabled"}
                  </Badge>
                </TableCell>
                {isOwnerOrCurator && (
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          setEditingCap(sv.address);
                          setCapInput(formatTokenAmount(sv.cap, assetDecimals).replace(/,/g, ""));
                        }}
                      >
                        Edit Cap
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemove(sv.address)}
                        disabled={removeVault.isPending || removeVault.isConfirming}
                      >
                        {removeVault.isPending || removeVault.isConfirming ? <Spinner className="size-3" /> : "Remove"}
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {isOwnerOrCurator && (
        <Button variant="outline" size="sm" onClick={onAddClick}>
          Add Sub-Vault
        </Button>
      )}
    </div>
  );
}
