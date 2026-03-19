"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { type UnifiedMarket } from "@/hooks/useUnifiedMarkets";
import { formatTokenAmount, formatPercent, shortenAddress } from "@/lib/format";

const PAGE_SIZE = 10;

interface VaultTableProps {
  markets: UnifiedMarket[];
  isLoading: boolean;
}

type SortKey = "totalSupply" | "totalBorrows" | "supplyAPY" | "borrowAPY" | "utilization";
type SortDir = "asc" | "desc";

const SNOWTRACE = "https://snowtrace.io/address";

// Maps token symbol → logo filename in /tokens/
const TOKEN_LOGOS: Record<string, string> = {
  USDC: "USDC_Logo.png",
  USDT: "USDT_Logo.png",
  "WETH.e": "ETH_Logo.png",
  weETH: "ETH_Logo.png",
  wrsETH: "ETH_Logo.png",
  WAVAX: "AVAX_Logo.png",
  upAVAX: "AVAX_Logo.png",
  "WBTC.e": "WBTC_Logo.png",
  "BTC.b": "BTC_Logo.png",
  "xBTC.b": "BTC_Logo.png",
  SolvBTC: "BTC_Logo.png",
  "SolvBTC.BBN": "BTC_Logo.png",
  sAVAX: "SAVAX_Logo.png",
  ggAVAX: "GGAVAX_Logo.png",
  AUSD: "AUSD_Logo.png",
  upAUSD: "AUSD_Logo.png",
  deUSD: "DEUSD_Logo.png",
  sdeUSD: "DEUSD_Logo.png",
  sUSDe: "SUSDE_Logo.png",
  "PT-USDe": "SUSDE_Logo.png",
  USDe: "USDE_Logo.png",
  savUSD: "SAVUSD_Logo.png",
  avUSD: "SAVUSD_Logo.png",
  savBTC: "SAVBTC_Logo.svg",
  reUSD: "REUSD_Logo.png",
  XAUt: "XAUT_Logo.png",
  tAVAX: "TAVAX_Logo.webp",
  sUSDp: "SUSDP_Logo.webp",
  sYUSD: "SYUSD_Logo.webp",
  yUSD: "SYUSD_Logo.webp",
};

// Fallback colors for tokens without logos
export const TOKEN_COLORS: Record<string, string> = {
  USDC: "bg-blue-500",
  USDT: "bg-emerald-500",
  "WETH.e": "bg-purple-500",
  WAVAX: "bg-red-500",
  "WBTC.e": "bg-orange-500",
  "BTC.b": "bg-orange-500",
  sAVAX: "bg-rose-500",
  ggAVAX: "bg-pink-500",
  AUSD: "bg-violet-500",
  avUSD: "bg-teal-500",
  savUSD: "bg-teal-600",
  deUSD: "bg-indigo-500",
  sdeUSD: "bg-indigo-600",
  sUSDe: "bg-sky-500",
  USDe: "bg-sky-400",
  SolvBTC: "bg-amber-600",
  "SolvBTC.BBN": "bg-amber-500",
  EURC: "bg-blue-600",
  xUSD: "bg-lime-500",
  xBTC: "bg-lime-600",
  savBTC: "bg-amber-700",
  reUSD: "bg-atala",
  yUSD: "bg-yellow-500",
  yUTY: "bg-yellow-600",
  tAVAX: "bg-red-600",
  XAUt: "bg-yellow-400",
  sACRED: "bg-fuchsia-500",
  sBUIDL: "bg-slate-500",
  sUSDp: "bg-green-500",
  sYUSD: "bg-yellow-700",
  weETH: "bg-purple-400",
  UTY: "bg-atala",
  upAUSD: "bg-violet-400",
  upAVAX: "bg-red-400",
  "PT-USDe": "bg-sky-600",
  wrsETH: "bg-purple-600",
  EUROP: "bg-blue-700",
  xUSDC: "bg-blue-400",
  "xBTC.b": "bg-orange-400",
};

// Protocol logos
export const PROTOCOL_LOGOS: Record<string, string> = {
  euler: "EULER_Logo.png",
  silo: "SILO_Logo.png",
};

export function TokenIcon({ symbol, size = "md" }: { symbol: string; size?: "sm" | "md" | "lg" }) {
  const px = size === "sm" ? 24 : size === "lg" ? 36 : 28;
  const dims = size === "sm" ? "h-6 w-6" : size === "lg" ? "h-9 w-9" : "h-7 w-7";
  const logo = TOKEN_LOGOS[symbol];

  if (logo) {
    return (
      <Image
        src={`/tokens/${logo}`}
        alt={symbol}
        width={px}
        height={px}
        className={`${dims} rounded-full object-cover shrink-0`}
      />
    );
  }

  // Fallback: colored circle with initials
  const textSize = size === "sm" ? "text-[8px]" : size === "lg" ? "text-xs" : "text-[10px]";
  return (
    <div
      className={`flex items-center justify-center rounded-full ${TOKEN_COLORS[symbol] ?? "bg-muted"} ${dims} ${textSize} font-bold text-white shrink-0`}
    >
      {symbol.replace(".e", "").replace(".b", "").slice(0, 2).toUpperCase()}
    </div>
  );
}

function ExternalAddressLink({ address, label }: { address: string; label?: string }) {
  return (
    <a
      href={`${SNOWTRACE}/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="text-[10px] text-muted-foreground hover:text-atala transition-colors font-mono"
      title={address}
    >
      {label ?? shortenAddress(address)}
    </a>
  );
}

const PROTOCOL_BADGE_STYLES: Record<string, { border: string; text: string; label: string }> = {
  euler: { border: "border-atala/40", text: "text-atala", label: "Euler" },
  silo: { border: "border-orange-500/40", text: "text-orange-400", label: "Silo" },
};

function ProtocolBadge({ protocol }: { protocol: "euler" | "silo" }) {
  const style = PROTOCOL_BADGE_STYLES[protocol];
  return (
    <Badge
      variant="outline"
      className={`text-[9px] px-1 py-0 font-normal ${style.border} ${style.text}`}
    >
      {style.label}
    </Badge>
  );
}

function SortArrow({ active, direction }: { active: boolean; direction: SortDir }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 text-muted-foreground/40 ml-1 shrink-0" viewBox="0 0 12 12" fill="currentColor">
        <path d="M6 2L9 5H3L6 2Z" />
        <path d="M6 10L3 7H9L6 10Z" />
      </svg>
    );
  }
  return (
    <svg className="w-3 h-3 text-foreground ml-1 shrink-0" viewBox="0 0 12 12" fill="currentColor">
      {direction === "asc" ? (
        <path d="M6 2L9 6H3L6 2Z" />
      ) : (
        <path d="M6 10L3 6H9L6 10Z" />
      )}
    </svg>
  );
}

const SORT_COLUMNS: { key: SortKey; label: string }[] = [
  { key: "totalSupply", label: "Total Supply" },
  { key: "totalBorrows", label: "Total Borrows" },
  { key: "supplyAPY", label: "Supply APY" },
  { key: "borrowAPY", label: "Borrow APY" },
  { key: "utilization", label: "Utilization" },
];

function getSortValue(market: UnifiedMarket, key: SortKey): number {
  const decimals = market.assetDecimals || 18;
  switch (key) {
    case "totalSupply":
      return Number(market.totalSupply) / 10 ** decimals;
    case "totalBorrows":
      return Number(market.totalBorrows) / 10 ** decimals;
    case "supplyAPY":
      return market.supplyAPY;
    case "borrowAPY":
      return market.borrowAPY;
    case "utilization":
      return market.utilization;
  }
}

export function VaultTable({ markets, isLoading }: VaultTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("totalSupply");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  // Reset to page 1 when markets list changes (filters, protocol switch)
  useEffect(() => {
    setPage(1);
  }, [markets.length]);

  const sorted = useMemo(() => {
    return [...markets].sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [markets, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  // Build page numbers: show 1, ..., current-1, current, current+1, ..., last
  function getPageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [];
    pages.push(1);
    if (currentPage > 3) pages.push("ellipsis");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="mr-3" />
        <span className="text-sm text-muted-foreground">
          Loading markets from Avalanche...
        </span>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <p className="text-sm">No markets found</p>
        <p className="text-xs mt-1">
          Try adjusting your filters or check your connection
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="w-[300px]">Market</TableHead>
              {SORT_COLUMNS.map((col) => (
                <TableHead
                  key={col.key}
                  className="text-right cursor-pointer select-none hover:text-foreground transition-colors"
                  onClick={() => handleSort(col.key)}
                >
                  <div className="flex items-center justify-end">
                    {col.label}
                    <SortArrow active={sortKey === col.key} direction={sortDir} />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((market) => {
            const href =
              market.protocol === "euler"
                ? `/markets/${market.id}`
                : `/markets/silo/${market.id}`;

            return (
              <TableRow
                key={`${market.protocol}-${market.id}`}
                className="border-border/30 hover:bg-accent/30"
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Link href={href}>
                      <TokenIcon symbol={market.asset} />
                    </Link>
                    <div>
                      <Link href={href} className="font-medium text-sm leading-tight hover:underline">
                        {market.name}
                      </Link>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ProtocolBadge protocol={market.protocol} />
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          {market.asset}
                        </Badge>
                        {market.collateral && (
                          <span className="text-[10px] text-muted-foreground">
                            / {market.collateral}
                          </span>
                        )}
                        <ExternalAddressLink address={market.id} />
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatTokenAmount(
                    market.totalSupply,
                    market.assetDecimals,
                    2
                  )}{" "}
                  <span className="text-muted-foreground text-xs">
                    {market.asset}
                  </span>
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatTokenAmount(
                    market.totalBorrows,
                    market.assetDecimals,
                    2
                  )}{" "}
                  <span className="text-muted-foreground text-xs">
                    {market.asset}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-sm text-emerald-400">
                    {formatPercent(market.supplyAPY)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-mono text-sm text-amber-400">
                    {formatPercent(market.borrowAPY)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(market.utilization, 100)}%`,
                          backgroundColor:
                            market.protocol === "euler"
                              ? "#BD0931"
                              : market.protocol === "silo"
                                ? "#f97316"
                                : "#3b82f6",
                        }}
                      />
                    </div>
                    <span className="font-mono text-xs text-muted-foreground w-12 text-right">
                      {formatPercent(market.utilization, 1)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length} markets
          </p>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={currentPage <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
              {getPageNumbers().map((p, i) =>
                p === "ellipsis" ? (
                  <PaginationItem key={`e-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === currentPage}
                      onClick={() => setPage(p)}
                      className="cursor-pointer"
                    >
                      {p}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
