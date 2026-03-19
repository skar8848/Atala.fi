"use client";

import { useMemo, useState } from "react";
import { useUnifiedMarkets } from "@/hooks/useUnifiedMarkets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { TokenIcon } from "@/components/markets/VaultTable";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis, Cell, Pie, PieChart } from "recharts";
import { formatPercent, formatUSD } from "@/lib/format";

const COLORS = [
  "#BD0931",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#BD0931",
  "#84cc16",
];

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

export default function AnalyticsPage() {
  const { markets, eulerCount, siloCount, isLoading } = useUnifiedMarkets();

  // TVL by asset
  const tvlByAsset = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of markets) {
      const price = priceEstimates[m.asset] ?? 1;
      const tvl =
        (Number(m.totalSupply) / Math.pow(10, m.assetDecimals)) * price;
      map.set(m.asset, (map.get(m.asset) ?? 0) + tvl);
    }
    return Array.from(map.entries())
      .map(([asset, tvl]) => ({ asset, tvl }))
      .sort((a, b) => b.tvl - a.tvl);
  }, [markets]);

  // Group small assets into "Other" from WAVAX position onwards
  const { tvlChartData, otherBreakdown } = useMemo(() => {
    const wavaxIdx = tvlByAsset.findIndex((d) => d.asset === "WAVAX");
    const cutoff = wavaxIdx >= 0 ? wavaxIdx : Math.min(5, tvlByAsset.length);

    const top = tvlByAsset.slice(0, cutoff);
    const rest = tvlByAsset.slice(cutoff);

    if (rest.length <= 1) {
      return { tvlChartData: tvlByAsset, otherBreakdown: [] };
    }

    const otherTvl = rest.reduce((sum, d) => sum + d.tvl, 0);
    return {
      tvlChartData: [...top, { asset: "Other", tvl: otherTvl }],
      otherBreakdown: rest,
    };
  }, [tvlByAsset]);

  const [showOtherBreakdown, setShowOtherBreakdown] = useState(false);

  // TVL by protocol — include Silo
  const tvlByProtocol = useMemo(() => {
    let eulerTVL = 0;
    let siloTVL = 0;
    for (const m of markets) {
      const price = priceEstimates[m.asset] ?? 1;
      const tvl =
        (Number(m.totalSupply) / Math.pow(10, m.assetDecimals)) * price;
      if (m.protocol === "euler") eulerTVL += tvl;
      else if (m.protocol === "silo") siloTVL += tvl;
    }
    return [
      { protocol: "Silo V2", tvl: siloTVL },
      { protocol: "Euler V2", tvl: eulerTVL },
    ].filter((d) => d.tvl > 0);
  }, [markets]);

  const PROTOCOL_COLORS = ["#f97316", "#BD0931"];

  // Top markets by supply APY — cap at 500% to filter outliers
  const topAPYMarkets = useMemo(() => {
    return [...markets]
      .filter((m) => m.totalSupply > 0n && m.supplyAPY > 0 && m.supplyAPY < 500)
      .sort((a, b) => b.supplyAPY - a.supplyAPY)
      .slice(0, 10)
      .map((m) => {
        const price = priceEstimates[m.asset] ?? 1;
        const tvl = (Number(m.totalSupply) / Math.pow(10, m.assetDecimals)) * price;
        return {
          name: m.name.length > 22 ? m.name.slice(0, 20) + "..." : m.name,
          fullName: m.name,
          supplyAPY: Number(m.supplyAPY.toFixed(2)),
          borrowAPY: Number(m.borrowAPY.toFixed(2)),
          tvl,
          asset: m.asset,
          protocol: m.protocol,
        };
      });
  }, [markets]);

  // Utilization distribution
  const utilizationBuckets = useMemo(() => {
    const buckets = [
      { range: "0-20%", count: 0 },
      { range: "20-40%", count: 0 },
      { range: "40-60%", count: 0 },
      { range: "60-80%", count: 0 },
      { range: "80-100%", count: 0 },
    ];
    for (const m of markets) {
      if (m.totalSupply === 0n) continue;
      const u = m.utilization;
      if (u < 20) buckets[0].count++;
      else if (u < 40) buckets[1].count++;
      else if (u < 60) buckets[2].count++;
      else if (u < 80) buckets[3].count++;
      else buckets[4].count++;
    }
    return buckets;
  }, [markets]);

  const tvlChartConfig: ChartConfig = {
    tvl: { label: "TVL (USD)", color: "#BD0931" },
  };

  const apyChartConfig: ChartConfig = {
    supplyAPY: { label: "Supply APY", color: "#10b981" },
  };

  const utilizationChartConfig: ChartConfig = {
    count: { label: "Markets", color: "#8b5cf6" },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cross-protocol analytics on Avalanche
          </p>
        </div>
        <div className="flex items-center justify-center py-32">
          <Spinner className="mr-3" />
          <span className="text-sm text-muted-foreground">
            Loading analytics...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cross-protocol lending analytics on Avalanche
        </p>
      </div>

      {/* Overview badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="text-xs">
          {markets.length} Markets
        </Badge>
        <Badge
          variant="outline"
          className="text-xs border-orange-500/40 text-orange-400"
        >
          {siloCount} Silo V2
        </Badge>
        <Badge
          variant="outline"
          className="text-xs border-atala/40 text-atala"
        >
          {eulerCount} Euler V2
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {new Set(markets.map((m) => m.asset)).size} Assets
        </Badge>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TVL by Asset */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">TVL by Asset</CardTitle>
          </CardHeader>
          <CardContent>
            {tvlChartData.length > 0 ? (
              <>
                <ChartContainer
                  config={tvlChartConfig}
                  className="h-[300px] w-full"
                >
                  <PieChart>
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) =>
                            `$${Number(value).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}`
                          }
                        />
                      }
                    />
                    <Pie
                      data={tvlChartData}
                      dataKey="tvl"
                      nameKey="asset"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      label={({ asset }) => asset}
                    >
                      {tvlChartData.map((d, i) => (
                        <Cell
                          key={i}
                          fill={d.asset === "Other" ? "#64748b" : COLORS[i % COLORS.length]}
                          className="outline-none cursor-pointer"
                          stroke={d.asset === "Other" && showOtherBreakdown ? "#94a3b8" : undefined}
                          strokeWidth={d.asset === "Other" && showOtherBreakdown ? 2 : undefined}
                          onMouseEnter={() => {
                            if (d.asset === "Other") setShowOtherBreakdown(true);
                          }}
                          onMouseLeave={() => {
                            if (d.asset === "Other") setShowOtherBreakdown(false);
                          }}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                {/* "Other" breakdown on hover — horizontal bar chart */}
                {showOtherBreakdown && otherBreakdown.length > 0 && (
                  <div
                    className="mt-2 rounded-lg border border-border/40 bg-background/80 backdrop-blur-sm p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200"
                    onMouseEnter={() => setShowOtherBreakdown(true)}
                    onMouseLeave={() => setShowOtherBreakdown(false)}
                  >
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Other Assets ({otherBreakdown.length})
                    </p>
                    <ChartContainer
                      config={tvlChartConfig}
                      className="w-full"
                      style={{ height: Math.max(120, otherBreakdown.length * 28) }}
                    >
                      <BarChart data={otherBreakdown} layout="vertical" margin={{ left: 10, right: 10 }}>
                        <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
                        <YAxis type="category" dataKey="asset" width={70} tick={{ fontSize: 10 }} />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value) =>
                                `$${Number(value).toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}`
                              }
                            />
                          }
                        />
                        <Bar dataKey="tvl" radius={[0, 4, 4, 0]}>
                          {otherBreakdown.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* TVL by Protocol */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">TVL by Protocol</CardTitle>
          </CardHeader>
          <CardContent>
            {tvlByProtocol.length > 0 ? (
              <ChartContainer
                config={tvlChartConfig}
                className="h-[300px] w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) =>
                          `$${Number(value).toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}`
                        }
                      />
                    }
                  />
                  <Pie
                    data={tvlByProtocol}
                    dataKey="tvl"
                    nameKey="protocol"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    label={({ protocol }) => protocol}
                  >
                    {tvlByProtocol.map((_, i) => (
                      <Cell
                        key={i}
                        fill={PROTOCOL_COLORS[i % PROTOCOL_COLORS.length]}
                        className="outline-none"
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Markets by Supply APY */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Top Markets by Supply APY
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topAPYMarkets.length > 0 ? (
              <ChartContainer
                config={apyChartConfig}
                className="h-[300px] w-full"
              >
                <BarChart data={topAPYMarkets} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 10 }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => `${value}%`}
                      />
                    }
                  />
                  <Bar
                    dataKey="supplyAPY"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Utilization Distribution */}
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              Utilization Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={utilizationChartConfig}
              className="h-[300px] w-full"
            >
              <BarChart data={utilizationBuckets}>
                <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => `${value} markets`}
                    />
                  }
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* APY Leaderboard */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">APY Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {topAPYMarkets.map((m, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 px-3 rounded hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-5 text-right">
                    {i + 1}
                  </span>
                  <TokenIcon symbol={m.asset} size="sm" />
                  <div>
                    <span className="text-sm font-medium">{m.fullName}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 ${
                          m.protocol === "euler"
                            ? "border-atala/40 text-atala"
                            : "border-orange-500/40 text-orange-400"
                        }`}
                      >
                        {m.protocol === "euler" ? "Euler" : "Silo"}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-[9px] px-1 py-0"
                      >
                        {m.asset}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      TVL
                    </span>
                    <p className="text-sm font-mono text-foreground">
                      {formatUSD(m.tvl)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      Supply
                    </span>
                    <p className="text-sm font-mono text-emerald-400">
                      {formatPercent(m.supplyAPY)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      Borrow
                    </span>
                    <p className="text-sm font-mono text-amber-400">
                      {formatPercent(m.borrowAPY)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
