"use client";

import { useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TokenIcon } from "@/components/markets/VaultTable";
import { cn } from "@/lib/utils";
import { type UnifiedMarket } from "@/hooks/useUnifiedMarkets";

export type SearchMode = "all" | "asset" | "collateral" | "address";

interface MarketFilterProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchMode: SearchMode;
  onSearchModeChange: (mode: SearchMode) => void;
  selectedAsset: string | null;
  onAssetChange: (asset: string | null) => void;
  markets: UnifiedMarket[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

interface AssetInfo {
  symbol: string;
  count: number;
}

const SEARCH_MODES: { value: SearchMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "asset", label: "Asset" },
  { value: "collateral", label: "Collateral" },
  { value: "address", label: "Address" },
];

export function MarketFilter({
  search,
  onSearchChange,
  searchMode,
  onSearchModeChange,
  selectedAsset,
  onAssetChange,
  markets,
  onClearFilters,
  hasActiveFilters,
}: MarketFilterProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  // Compute top assets sorted by number of markets
  const assetInfos: AssetInfo[] = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of markets) {
      counts.set(m.asset, (counts.get(m.asset) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([symbol, count]) => ({ symbol, count }))
      .sort((a, b) => b.count - a.count);
  }, [markets]);

  const TOP_N = 3;
  const topAssets = assetInfos.slice(0, TOP_N);
  const restAssets = assetInfos.slice(TOP_N);
  const restCount = restAssets.length;

  const placeholders: Record<SearchMode, string> = {
    all: "Search by name, asset, collateral, or address...",
    asset: "Search by asset symbol (e.g. USDC, WAVAX)...",
    collateral: "Search by collateral token...",
    address: "Search by vault or token address...",
  };

  function handleSearchIconClick() {
    searchRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Search bar with mode chips */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search mode chips */}
        <div className="flex items-center gap-1">
          {SEARCH_MODES.map((mode) => (
            <button
              key={mode.value}
              onClick={() => onSearchModeChange(mode.value)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-all",
                searchMode === mode.value
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <Input
          ref={searchRef}
          placeholder={placeholders[searchMode]}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="max-w-sm h-9 bg-background/50 border-border/40 text-sm"
        />

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border border-border/40"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3L9 9M9 3L3 9" />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Row 2: Asset avatar group with hover expand */}
      <div className="flex items-center gap-1.5">
        {/* All button */}
        <Badge
          variant={selectedAsset === null ? "default" : "secondary"}
          className={cn(
            "cursor-pointer text-xs transition-colors h-7 px-2.5",
            selectedAsset === null
              ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border-cyan-500/30"
              : "hover:bg-accent"
          )}
          onClick={() => onAssetChange(null)}
        >
          All
        </Badge>

        {/* Top 3 assets as token avatar pills */}
        {topAssets.map((asset) => (
          <button
            key={asset.symbol}
            onClick={() => onAssetChange(selectedAsset === asset.symbol ? null : asset.symbol)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-1.5 py-0.5 transition-all border",
              selectedAsset === asset.symbol
                ? "border-cyan-500/50 bg-cyan-500/10"
                : "border-transparent hover:border-border/50 hover:bg-accent/50"
            )}
          >
            <TokenIcon symbol={asset.symbol} size="sm" />
            <span className="text-xs font-medium pr-1">{asset.symbol}</span>
            <span className="text-[10px] text-muted-foreground">{asset.count}</span>
          </button>
        ))}

        {/* Stacked rest: overlapping avatars that expand on hover */}
        {restCount > 0 && (
          <div className="relative flex items-center ml-1 group/stack">
            {/* Collapsed view: overlapping avatars */}
            <div className="flex items-center">
              <div className="flex -space-x-2 group-hover/stack:hidden">
                {restAssets.slice(0, 3).map((asset, idx) => (
                  <button
                    key={asset.symbol}
                    onClick={() => onAssetChange(selectedAsset === asset.symbol ? null : asset.symbol)}
                    className={cn(
                      "relative rounded-full ring-2 ring-background transition-transform hover:scale-110 hover:z-10",
                      selectedAsset === asset.symbol && "ring-cyan-500/50"
                    )}
                    style={{ zIndex: 3 - idx }}
                    title={`${asset.symbol} (${asset.count})`}
                  >
                    <TokenIcon symbol={asset.symbol} size="sm" />
                  </button>
                ))}
                {restCount > 3 && (
                  <div
                    className="relative flex items-center justify-center h-6 w-6 rounded-full bg-muted text-[9px] font-bold text-muted-foreground ring-2 ring-background"
                    style={{ zIndex: 0 }}
                  >
                    +{restCount - 3}
                  </div>
                )}
              </div>

              {/* Expanded view: show up to 6 more assets on hover */}
              <div className="hidden group-hover/stack:flex items-center gap-1 animate-in fade-in-0 slide-in-from-left-2 duration-200">
                {restAssets.slice(0, 6).map((asset) => (
                  <button
                    key={asset.symbol}
                    onClick={() => onAssetChange(selectedAsset === asset.symbol ? null : asset.symbol)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-1.5 py-0.5 transition-all border",
                      selectedAsset === asset.symbol
                        ? "border-cyan-500/50 bg-cyan-500/10"
                        : "border-transparent hover:border-border/50 hover:bg-accent/50"
                    )}
                    title={`${asset.symbol} (${asset.count})`}
                  >
                    <TokenIcon symbol={asset.symbol} size="sm" />
                    <span className="text-[10px] font-medium">{asset.symbol}</span>
                    <span className="text-[9px] text-muted-foreground">{asset.count}</span>
                  </button>
                ))}
                {restCount > 6 && (
                  <div className="flex items-center justify-center h-6 px-1.5 rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                    +{restCount - 6}
                  </div>
                )}

                {/* Search icon at the end */}
                <button
                  onClick={handleSearchIconClick}
                  className="flex items-center justify-center h-6 w-6 rounded-full bg-muted/80 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Search assets"
                >
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="5" cy="5" r="3.5" />
                    <path d="M7.5 7.5L10 10" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
