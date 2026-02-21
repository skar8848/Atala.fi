"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAtalaVaults } from "@/hooks/useAtalaVaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { TokenIcon } from "@/components/markets/VaultTable";
import { formatTokenAmount, shortenAddress, formatIdleRatio } from "@/lib/format";
import Link from "next/link";

export default function BuildPage() {
  const { address, isConnected } = useAccount();
  const { vaults, isLoading } = useAtalaVaults(address);

  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Build</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your own yield aggregation vaults
          </p>
        </div>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to manage your vaults
            </p>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Build</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage your own yield aggregation vaults
          </p>
        </div>
        <Link
          href="/build/create"
          className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Create Vault
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="mr-2" />
          <span className="text-sm text-muted-foreground">Loading your vaults...</span>
        </div>
      ) : vaults.length === 0 ? (
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <svg className="w-6 h-6 text-muted-foreground" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <path d="M8 5v6M5 8h6" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">No vaults yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Deploy your first vault to aggregate yield across Euler V2 and Silo V2 markets
              </p>
            </div>
            <Link
              href="/build/create"
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              Create Your First Vault
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {vaults.map((vault) => (
            <Link key={vault.address} href={`/build/${vault.address}`}>
              <Card className="border-border/40 bg-card/50 hover:border-border/60 hover:bg-card/70 transition-all cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base truncate">{vault.name}</CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <TokenIcon symbol={vault.assetSymbol} size="sm" />
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {vault.assetSymbol}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground">
                    {shortenAddress(vault.address)}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Assets</p>
                      <p className="text-sm font-mono font-medium">
                        {formatTokenAmount(vault.totalAssets, vault.assetDecimals)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Idle</p>
                      <p className="text-sm font-mono font-medium">
                        {formatTokenAmount(vault.idle, vault.assetDecimals)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Sub-vaults</p>
                      <p className="text-sm font-medium">{vault.vaultCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Idle Ratio</p>
                      <p className="text-sm font-mono font-medium">
                        {formatIdleRatio(vault.idle, vault.totalAssets)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
