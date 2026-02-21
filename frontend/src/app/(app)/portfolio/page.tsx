"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useVaultDiscovery } from "@/hooks/useVaultDiscovery";
import { usePortfolio } from "@/hooks/usePortfolio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { TokenIcon } from "@/components/markets/VaultTable";
import { formatTokenAmount, formatPercent, shortenAddress } from "@/lib/format";

export default function PortfolioPage() {
  const { address: userAddress, isConnected } = useAccount();
  const { vaultAddresses } = useVaultDiscovery();
  const { positions, isLoading } = usePortfolio(vaultAddresses);
  const [copied, setCopied] = useState(false);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your lending and borrowing positions
          </p>
        </div>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to view your positions
            </p>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  function handleCopyAddress() {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const supplyPositions = positions.filter((p) => p.shares > 0n);
  const borrowPositions = positions.filter((p) => p.debt > 0n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your positions across Euler V2 vaults on Avalanche
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Supplying</p>
            <p className="text-2xl font-semibold mt-1">
              {supplyPositions.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vault{supplyPositions.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Borrowing</p>
            <p className="text-2xl font-semibold mt-1">
              {borrowPositions.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              vault{borrowPositions.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Wallet</p>
            <button
              onClick={handleCopyAddress}
              className="flex items-center gap-2 mt-2 group/copy"
              title="Copy address"
            >
              <span className="text-sm font-mono">
                {shortenAddress(userAddress ?? "", 6)}
              </span>
              {copied ? (
                <span className="text-[10px] font-medium text-emerald-400 animate-in fade-in-0 duration-150">
                  Copied!
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5 text-muted-foreground group-hover/copy:text-foreground transition-colors"
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
          </CardContent>
        </Card>
      </div>

      {/* Supply Positions */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Supply Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : supplyPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No supply positions found.{" "}
              <a href="/markets" className="text-cyan-400 hover:underline">
                Explore markets
              </a>
            </p>
          ) : (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead>Vault</TableHead>
                    <TableHead className="text-right">Shares</TableHead>
                    <TableHead className="text-right">Supply APY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplyPositions.map((pos) => (
                    <TableRow
                      key={pos.vaultAddress}
                      className="border-border/30"
                    >
                      <TableCell>
                        <
                          href={`/markets/${pos.vaultAddress}`}
                          className="hover:underline"
                        >
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={pos.assetSymbol} size="sm" />
                            <div>
                              <div className="font-medium text-sm">
                                {pos.vaultName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0"
                                >
                                  {pos.assetSymbol}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {shortenAddress(pos.vaultAddress)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </a>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatTokenAmount(pos.shares, pos.assetDecimals)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm text-emerald-400">
                          {formatPercent(pos.supplyAPY)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Borrow Positions */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Borrow Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Spinner className="mr-2" />
              <span className="text-sm text-muted-foreground">Loading...</span>
            </div>
          ) : borrowPositions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No borrow positions found
            </p>
          ) : (
            <div className="rounded-lg border border-border/30 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/50">
                    <TableHead>Vault</TableHead>
                    <TableHead className="text-right">Debt</TableHead>
                    <TableHead className="text-right">Borrow APY</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {borrowPositions.map((pos) => (
                    <TableRow
                      key={`borrow-${pos.vaultAddress}`}
                      className="border-border/30"
                    >
                      <TableCell>
                        <
                          href={`/markets/${pos.vaultAddress}`}
                          className="hover:underline"
                        >
                          <div className="flex items-center gap-2">
                            <TokenIcon symbol={pos.assetSymbol} size="sm" />
                            <div>
                              <div className="font-medium text-sm">
                                {pos.vaultName}
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 mt-0.5"
                              >
                                {pos.assetSymbol}
                              </Badge>
                            </div>
                          </div>
                        </a>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatTokenAmount(pos.debt, pos.assetDecimals)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-mono text-sm text-amber-400">
                          {formatPercent(pos.borrowAPY)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
