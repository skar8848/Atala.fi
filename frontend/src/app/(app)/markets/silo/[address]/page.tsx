"use client";

import { useParams } from "next/navigation";
import { useReadContracts } from "wagmi";
import {
  SILO_ADDRESSES,
  siloConfigAbi,
  siloLensAbi,
} from "@/config/silo";
import { erc20Abi } from "@/config/abis";
import { getTokenByAddress } from "@/config/contracts";
import { formatTokenAmount, formatPercent, shortenAddress } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { TokenIcon } from "@/components/markets/VaultTable";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

const SNOWTRACE = "https://snowtrace.io/address";
const LENS = SILO_ADDRESSES.SILO_LENS as `0x${string}`;

export default function SiloMarketDetailPage() {
  const params = useParams();
  const configAddress = params.address as `0x${string}`;

  // Step 1: Get silo0 and silo1 addresses from SiloConfig
  const { data: silosData, isLoading: silosLoading } = useReadContracts({
    contracts: [
      {
        address: configAddress,
        abi: siloConfigAbi,
        functionName: "getSilos",
      },
    ],
    query: { staleTime: 60_000 },
  });

  const silosResult = silosData?.[0];
  const silo0 =
    silosResult?.status === "success"
      ? (silosResult.result as [`0x${string}`, `0x${string}`])[0]
      : undefined;
  const silo1 =
    silosResult?.status === "success"
      ? (silosResult.result as [`0x${string}`, `0x${string}`])[1]
      : undefined;

  // Step 2: Read assets + SiloLens data for both silos
  const lensContracts =
    silo0 && silo1
      ? [
          // Assets
          { address: configAddress, abi: siloConfigAbi, functionName: "getAssetForSilo" as const, args: [silo0] },
          { address: configAddress, abi: siloConfigAbi, functionName: "getAssetForSilo" as const, args: [silo1] },
          // Deposits
          { address: LENS, abi: siloLensAbi, functionName: "totalDepositsWithInterest" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "totalDepositsWithInterest" as const, args: [silo1] },
          // Borrows
          { address: LENS, abi: siloLensAbi, functionName: "totalBorrowAmountWithInterest" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "totalBorrowAmountWithInterest" as const, args: [silo1] },
          // Deposit APR
          { address: LENS, abi: siloLensAbi, functionName: "getDepositAPR" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "getDepositAPR" as const, args: [silo1] },
          // Borrow APR
          { address: LENS, abi: siloLensAbi, functionName: "getBorrowAPR" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "getBorrowAPR" as const, args: [silo1] },
          // Utilization
          { address: LENS, abi: siloLensAbi, functionName: "getUtilization" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "getUtilization" as const, args: [silo1] },
          // Liquidity
          { address: LENS, abi: siloLensAbi, functionName: "liquidity" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "liquidity" as const, args: [silo1] },
          // Max LTV
          { address: LENS, abi: siloLensAbi, functionName: "getMaxLtv" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "getMaxLtv" as const, args: [silo1] },
          // Liquidation Threshold
          { address: LENS, abi: siloLensAbi, functionName: "getLt" as const, args: [silo0] },
          { address: LENS, abi: siloLensAbi, functionName: "getLt" as const, args: [silo1] },
        ]
      : [];

  const { data: lensData, isLoading: lensLoading } = useReadContracts({
    contracts: lensContracts,
    query: { enabled: !!silo0 && !!silo1, staleTime: 30_000 },
  });

  // Get token addresses for metadata lookup
  const token0Address =
    lensData?.[0]?.status === "success"
      ? (lensData[0].result as `0x${string}`)
      : undefined;
  const token1Address =
    lensData?.[1]?.status === "success"
      ? (lensData[1].result as `0x${string}`)
      : undefined;

  // Check if we need on-chain symbol/decimals for unknown tokens
  const meta0 = token0Address ? getTokenByAddress(token0Address) : undefined;
  const meta1 = token1Address ? getTokenByAddress(token1Address) : undefined;

  const unknowns: `0x${string}`[] = [];
  if (token0Address && !meta0) unknowns.push(token0Address);
  if (token1Address && !meta1) unknowns.push(token1Address);

  const fallbackContracts = unknowns.flatMap((addr) => [
    { address: addr, abi: erc20Abi, functionName: "symbol" as const },
    { address: addr, abi: erc20Abi, functionName: "decimals" as const },
  ]);

  const { data: fallbackData } = useReadContracts({
    contracts: fallbackContracts,
    query: { enabled: unknowns.length > 0, staleTime: 300_000 },
  });

  const fallbackMap = new Map<string, { symbol: string; decimals: number }>();
  if (fallbackData) {
    for (let i = 0; i < unknowns.length; i++) {
      const sym =
        fallbackData[i * 2]?.status === "success"
          ? (fallbackData[i * 2].result as string)
          : "???";
      const dec =
        fallbackData[i * 2 + 1]?.status === "success"
          ? Number(fallbackData[i * 2 + 1].result)
          : 18;
      fallbackMap.set(unknowns[i].toLowerCase(), { symbol: sym, decimals: dec });
    }
  }

  // Loading state
  if (silosLoading || lensLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner className="mr-3" />
        <span className="text-sm text-muted-foreground">
          Loading Silo market data...
        </span>
      </div>
    );
  }

  if (!silo0 || !silo1 || !lensData) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
        <p className="text-sm">Failed to load market data</p>
        <p className="text-xs mt-1">
          SiloConfig {shortenAddress(configAddress)} may not be valid
        </p>
        <Link
          href="/markets"
          className="mt-4 text-sm text-atala hover:underline"
        >
          Back to Markets
        </Link>
      </div>
    );
  }

  // Parse lens data
  const get = (i: number) =>
    lensData[i]?.status === "success" ? lensData[i].result : null;

  const token0Symbol =
    meta0?.symbol ?? fallbackMap.get(token0Address!.toLowerCase())?.symbol ?? "???";
  const token1Symbol =
    meta1?.symbol ?? fallbackMap.get(token1Address!.toLowerCase())?.symbol ?? "???";
  const token0Decimals =
    meta0?.decimals ?? fallbackMap.get(token0Address!.toLowerCase())?.decimals ?? 18;
  const token1Decimals =
    meta1?.decimals ?? fallbackMap.get(token1Address!.toLowerCase())?.decimals ?? 18;

  const deposits0 = (get(2) as bigint) ?? 0n;
  const deposits1 = (get(3) as bigint) ?? 0n;
  const borrows0 = (get(4) as bigint) ?? 0n;
  const borrows1 = (get(5) as bigint) ?? 0n;

  // APRs in 18 decimals (1e18 = 100%)
  const supplyAPY0 = get(6) !== null ? Number(get(6) as bigint) / 1e16 : 0;
  const supplyAPY1 = get(7) !== null ? Number(get(7) as bigint) / 1e16 : 0;
  const borrowAPY0 = get(8) !== null ? Number(get(8) as bigint) / 1e16 : 0;
  const borrowAPY1 = get(9) !== null ? Number(get(9) as bigint) / 1e16 : 0;

  const utilization0 = get(10) !== null ? Number(get(10) as bigint) / 1e16 : 0;
  const utilization1 = get(11) !== null ? Number(get(11) as bigint) / 1e16 : 0;

  const liquidity0 = (get(12) as bigint) ?? 0n;
  const liquidity1 = (get(13) as bigint) ?? 0n;

  const maxLtv0 = get(14) !== null ? Number(get(14) as bigint) / 1e16 : 0;
  const maxLtv1 = get(15) !== null ? Number(get(15) as bigint) / 1e16 : 0;

  const lt0 = get(16) !== null ? Number(get(16) as bigint) / 1e16 : 0;
  const lt1 = get(17) !== null ? Number(get(17) as bigint) / 1e16 : 0;

  const marketName = `${token0Symbol} / ${token1Symbol}`;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/markets"
          className="hover:text-foreground transition-colors"
        >
          Markets
        </Link>
        <span>/</span>
        <span className="text-foreground">{marketName}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <TokenIcon symbol={token0Symbol} size="lg" />
              <TokenIcon symbol={token1Symbol} size="lg" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {marketName}
            </h1>
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 font-normal border-orange-500/40 text-orange-400"
            >
              Silo V2
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-muted-foreground">Isolated Market</span>
            <span className="text-xs text-muted-foreground font-mono">
              {configAddress}
            </span>
          </div>
        </div>
      </div>

      {/* Two-sided overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SiloSideCard
          label={`Silo 0 — ${token0Symbol}`}
          symbol={token0Symbol}
          siloAddress={silo0}
          tokenAddress={token0Address!}
          decimals={token0Decimals}
          deposits={deposits0}
          borrows={borrows0}
          liquidity={liquidity0}
          supplyAPY={supplyAPY0}
          borrowAPY={borrowAPY0}
          utilization={utilization0}
          maxLtv={maxLtv0}
          lt={lt0}
        />
        <SiloSideCard
          label={`Silo 1 — ${token1Symbol}`}
          symbol={token1Symbol}
          siloAddress={silo1}
          tokenAddress={token1Address!}
          decimals={token1Decimals}
          deposits={deposits1}
          borrows={borrows1}
          liquidity={liquidity1}
          supplyAPY={supplyAPY1}
          borrowAPY={borrowAPY1}
          utilization={utilization1}
          maxLtv={maxLtv1}
          lt={lt1}
        />
      </div>

      {/* Addresses */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contract Addresses</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <AddressRow label="SiloConfig" address={configAddress} />
          <AddressRow label={`Silo 0 (${token0Symbol})`} address={silo0} />
          <AddressRow label={`Silo 1 (${token1Symbol})`} address={silo1} />
          {token0Address && (
            <AddressRow label={`Token 0 (${token0Symbol})`} address={token0Address} />
          )}
          {token1Address && (
            <AddressRow label={`Token 1 (${token1Symbol})`} address={token1Address} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SiloSideCard({
  label,
  symbol,
  siloAddress,
  tokenAddress,
  decimals,
  deposits,
  borrows,
  liquidity,
  supplyAPY,
  borrowAPY,
  utilization,
  maxLtv,
  lt,
}: {
  label: string;
  symbol: string;
  siloAddress: `0x${string}`;
  tokenAddress: `0x${string}`;
  decimals: number;
  deposits: bigint;
  borrows: bigint;
  liquidity: bigint;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  maxLtv: number;
  lt: number;
}) {
  return (
    <Card className="border-border/40 bg-card/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TokenIcon symbol={symbol} size="md" />
          <CardTitle className="text-base">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Deposits & Borrows */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Total Deposits</p>
            <p className="text-sm font-mono font-semibold mt-0.5">
              {formatTokenAmount(deposits, decimals)} {symbol}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Borrows</p>
            <p className="text-sm font-mono font-semibold mt-0.5">
              {formatTokenAmount(borrows, decimals)} {symbol}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Available Liquidity</p>
          <p className="text-sm font-mono font-semibold mt-0.5">
            {formatTokenAmount(liquidity, decimals)} {symbol}
          </p>
        </div>

        <Separator className="bg-border/30" />

        {/* APYs */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Supply APY</span>
          <span className="font-mono text-lg text-emerald-400">
            {formatPercent(supplyAPY)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Borrow APY</span>
          <span className="font-mono text-lg text-amber-400">
            {formatPercent(borrowAPY)}
          </span>
        </div>

        <Separator className="bg-border/30" />

        {/* Utilization bar */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Utilization</span>
          <div className="flex items-center gap-3">
            <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
            <span className="font-mono text-sm">
              {formatPercent(utilization, 1)}
            </span>
          </div>
        </div>

        <Separator className="bg-border/30" />

        {/* Risk parameters */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Max LTV</span>
          <span className="text-xs font-mono">
            {formatPercent(maxLtv, 1)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Liquidation Threshold
          </span>
          <span className="text-xs font-mono">{formatPercent(lt, 1)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AddressRow({
  label,
  address,
}: {
  label: string;
  address: string;
}) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="flex items-center justify-between py-1 cursor-pointer hover:bg-accent/30 rounded px-1 -mx-1 transition-colors">
          <span className="text-xs text-muted-foreground">{label}</span>
          <a
            href={`${SNOWTRACE}/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-mono text-atala hover:underline"
          >
            {shortenAddress(address)}
          </a>
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-auto" side="left">
        <p className="text-xs font-mono break-all">{address}</p>
      </HoverCardContent>
    </HoverCard>
  );
}
