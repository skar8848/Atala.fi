"use client";

import { useParams } from "next/navigation";
import { useReadContracts } from "wagmi";
import { evkVaultAbi } from "@/config/abis";
import { getTokenByAddress, EULER_ADDRESSES } from "@/config/contracts";
import {
  formatTokenAmount,
  formatPercent,
  interestRateToAPY,
  calcUtilization,
  shortenAddress,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { TokenIcon } from "@/components/markets/VaultTable";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function VaultDetailPage() {
  const params = useParams();
  const address = params.address as `0x${string}`;

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address, abi: evkVaultAbi, functionName: "name" },
      { address, abi: evkVaultAbi, functionName: "symbol" },
      { address, abi: evkVaultAbi, functionName: "asset" },
      { address, abi: evkVaultAbi, functionName: "totalAssets" },
      { address, abi: evkVaultAbi, functionName: "totalBorrows" },
      { address, abi: evkVaultAbi, functionName: "interestRate" },
      { address, abi: evkVaultAbi, functionName: "caps" },
      { address, abi: evkVaultAbi, functionName: "cash" },
      { address, abi: evkVaultAbi, functionName: "governorAdmin" },
      { address, abi: evkVaultAbi, functionName: "oracle" },
      { address, abi: evkVaultAbi, functionName: "interestRateModel" },
      { address, abi: evkVaultAbi, functionName: "unitOfAccount" },
      { address, abi: evkVaultAbi, functionName: "creator" },
    ],
    query: { staleTime: 15_000 },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner className="mr-3" />
        <span className="text-sm text-muted-foreground">Loading vault data...</span>
      </div>
    );
  }

  const get = (i: number) =>
    data?.[i]?.status === "success" ? data[i].result : null;

  const name = (get(0) as string) ?? "Unknown Vault";
  const symbol = (get(1) as string) ?? "???";
  const assetAddress = (get(2) as `0x${string}`) ?? "0x0";
  const totalAssets = (get(3) as bigint) ?? 0n;
  const totalBorrows = (get(4) as bigint) ?? 0n;
  const interestRate = (get(5) as bigint) ?? 0n;
  const caps = (get(6) as [number, number]) ?? [0, 0];
  const cash = (get(7) as bigint) ?? 0n;
  const governor = (get(8) as string) ?? "";
  const oracle = (get(9) as string) ?? "";
  const irm = (get(10) as string) ?? "";
  const unitOfAccount = (get(11) as string) ?? "";
  const creator = (get(12) as string) ?? "";

  const tokenMeta = getTokenByAddress(assetAddress);
  const assetSymbol = tokenMeta?.symbol ?? "???";
  const decimals = tokenMeta?.decimals ?? 18;

  const borrowAPY = interestRateToAPY(interestRate);
  const utilization = calcUtilization(totalBorrows, totalAssets + totalBorrows);
  const supplyAPY = borrowAPY * (utilization / 100);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <a href="/markets" className="hover:text-foreground transition-colors">
          Markets
        </a>
        <span>/</span>
        <span className="text-foreground">{name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
            <Badge variant="secondary" className="text-xs">
              {symbol}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <TokenIcon symbol={assetSymbol} size="sm" />
            <Badge
              variant="outline"
              className="text-[10px] font-normal border-border/50"
            >
              {assetSymbol}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {address}
            </span>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Supply"
          value={`${formatTokenAmount(totalAssets, decimals)} ${assetSymbol}`}
        />
        <MetricCard
          label="Total Borrows"
          value={`${formatTokenAmount(totalBorrows, decimals)} ${assetSymbol}`}
        />
        <MetricCard
          label="Available Liquidity"
          value={`${formatTokenAmount(cash, decimals)} ${assetSymbol}`}
        />
        <MetricCard
          label="Utilization"
          value={formatPercent(utilization, 1)}
        />
      </div>

      {/* APY + Config */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* APY Card */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Interest Rates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Supply APY</span>
              <span className="font-mono text-lg text-emerald-400">
                {formatPercent(supplyAPY)}
              </span>
            </div>
            <Separator className="bg-border/30" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Borrow APY</span>
              <span className="font-mono text-lg text-amber-400">
                {formatPercent(borrowAPY)}
              </span>
            </div>
            <Separator className="bg-border/30" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Utilization</span>
              <div className="flex items-center gap-3">
                <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-cyan-400 transition-all"
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
                <span className="font-mono text-sm">
                  {formatPercent(utilization, 1)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConfigRow label="Supply Cap" value={caps[0].toString()} />
            <ConfigRow label="Borrow Cap" value={caps[1].toString()} />
            <ConfigRow
              label="Governor"
              value={governor ? shortenAddress(governor) : "None"}
              full={governor}
            />
            <ConfigRow
              label="Oracle"
              value={oracle ? shortenAddress(oracle) : "None"}
              full={oracle}
            />
            <ConfigRow
              label="IRM"
              value={irm ? shortenAddress(irm) : "None"}
              full={irm}
            />
            <ConfigRow
              label="Unit of Account"
              value={unitOfAccount ? shortenAddress(unitOfAccount) : "None"}
              full={unitOfAccount}
            />
            <ConfigRow
              label="Creator"
              value={creator ? shortenAddress(creator) : "None"}
              full={creator}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold tracking-tight mt-1 font-mono">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function ConfigRow({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: string;
}) {
  const content = (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono">{value}</span>
    </div>
  );

  if (full && full !== "0x0000000000000000000000000000000000000000") {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1 transition-colors">
            {content}
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto" side="left">
          <p className="text-xs font-mono break-all">{full}</p>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return content;
}
