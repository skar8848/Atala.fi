"use client";

import { Card, CardContent } from "@/components/ui/card";
import { type UnifiedMarket, type Protocol } from "@/hooks/useUnifiedMarkets";
import { formatUSD } from "@/lib/format";

interface MarketStatsProps {
  markets: UnifiedMarket[];
  isLoading: boolean;
  protocol: Protocol;
}

const priceEstimates: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  WAVAX: 25,
  "WETH.e": 2800,
  "WBTC.e": 65000,
  "BTC.b": 65000,
  sAVAX: 27,
  ggAVAX: 26,
  AUSD: 1,
  avUSD: 1,
  savUSD: 1,
  deUSD: 1,
  sdeUSD: 1,
  sUSDe: 1,
  USDe: 1,
  SolvBTC: 65000,
  "SolvBTC.BBN": 65000,
  EURC: 1.08,
  xUSD: 1,
  xBTC: 65000,
  savBTC: 65000,
  reUSD: 1,
  yUSD: 1,
  yUTY: 1,
  tAVAX: 25,
  XAUt: 2400,
  sACRED: 1,
  sBUIDL: 1,
  sUSDp: 1,
  sYUSD: 1,
  weETH: 3000,
  wrsETH: 3000,
  EUROP: 1.08,
  UTY: 1,
  upAUSD: 1,
  upAVAX: 25,
  "PT-USDe": 1,
  xUSDC: 1,
  "xBTC.b": 65000,
};

export function MarketStats({ markets, isLoading, protocol }: MarketStatsProps) {
  let totalTVL = 0;
  let totalBorrowed = 0;
  let avgSupplyAPY = 0;
  let weightedAPYDenom = 0;

  for (const m of markets) {
    const price = priceEstimates[m.asset] ?? 1;
    const divisor = Math.pow(10, m.assetDecimals);
    const tvl = (Number(m.totalSupply) / divisor) * price;
    const borrowed = (Number(m.totalBorrows) / divisor) * price;

    totalTVL += tvl;
    totalBorrowed += borrowed;

    // Cap APY at 500% to exclude outliers from weighted average
    if (tvl > 0 && m.supplyAPY < 500) {
      avgSupplyAPY += m.supplyAPY * tvl;
      weightedAPYDenom += tvl;
    }
  }

  const weightedAvgAPY =
    weightedAPYDenom > 0 ? avgSupplyAPY / weightedAPYDenom : 0;

  const protocolLabel =
    protocol === "all"
      ? "all protocols"
      : protocol === "euler"
        ? "Euler V2"
        : "Silo V2";

  const stats = [
    {
      label: "Total Value Locked",
      value: isLoading ? "..." : formatUSD(totalTVL),
      subtext: `${markets.length} markets`,
    },
    {
      label: "Total Borrowed",
      value: isLoading ? "..." : formatUSD(totalBorrowed),
      subtext: `${((totalBorrowed / (totalTVL || 1)) * 100).toFixed(1)}% utilization`,
    },
    {
      label: "Available Liquidity",
      value: isLoading ? "..." : formatUSD(totalTVL - totalBorrowed),
      subtext: `across ${protocolLabel}`,
    },
    {
      label: "Avg Supply APY",
      value: isLoading ? "..." : `${weightedAvgAPY.toFixed(2)}%`,
      subtext: "weighted by TVL",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/40 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-2xl font-semibold tracking-tight mt-1">
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{stat.subtext}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
