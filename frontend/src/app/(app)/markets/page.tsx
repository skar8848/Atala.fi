"use client";

import { useMemo, useState } from "react";
import { useUnifiedMarkets, type Protocol } from "@/hooks/useUnifiedMarkets";
import { VaultTable } from "@/components/markets/VaultTable";
import { MarketStats } from "@/components/markets/MarketStats";
import { MarketFilter, type SearchMode } from "@/components/markets/MarketFilter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PROTOCOL_TABS: { value: Protocol; label: string; color: string }[] = [
  { value: "all", label: "All Markets", color: "text-foreground" },
  { value: "silo", label: "Silo V2", color: "text-orange-400" },
  { value: "euler", label: "Euler V2", color: "text-atala" },
];

export default function MarketsPage() {
  const { markets, eulerCount, siloCount, isLoading } = useUnifiedMarkets();

  const [protocol, setProtocol] = useState<Protocol>("all");
  const [search, setSearch] = useState("");
  const [searchMode, setSearchMode] = useState<SearchMode>("all");
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  // Filter by protocol — used for stats (unaffected by search/asset filter)
  const protocolFiltered = useMemo(() => {
    if (protocol === "all") return markets;
    return markets.filter((m) => m.protocol === protocol);
  }, [markets, protocol]);

  // Filter by search and asset — used for the table
  const filteredMarkets = useMemo(() => {
    return protocolFiltered.filter((m) => {
      const q = search.toLowerCase();

      let matchesSearch = true;
      if (q) {
        switch (searchMode) {
          case "asset":
            matchesSearch = m.asset.toLowerCase().includes(q);
            break;
          case "collateral":
            matchesSearch = m.collateral?.toLowerCase().includes(q) ?? false;
            break;
          case "address":
            matchesSearch = m.id.toLowerCase().includes(q);
            break;
          case "all":
          default:
            matchesSearch =
              m.name.toLowerCase().includes(q) ||
              m.asset.toLowerCase().includes(q) ||
              m.id.toLowerCase().includes(q) ||
              (m.collateral?.toLowerCase().includes(q) ?? false);
            break;
        }
      }

      const matchesAsset = !selectedAsset || m.asset === selectedAsset;

      return matchesSearch && matchesAsset;
    });
  }, [protocolFiltered, search, searchMode, selectedAsset]);

  const hasActiveFilters = search !== "" || selectedAsset !== null || searchMode !== "all";

  function handleClearFilters() {
    setSearch("");
    setSearchMode("all");
    setSelectedAsset(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Markets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore lending markets across Euler V2 and Silo V2 on Avalanche
          </p>
        </div>

        {/* Protocol Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1">
          {PROTOCOL_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setProtocol(tab.value);
                setSelectedAsset(null);
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                protocol === tab.value
                  ? "bg-background shadow-sm " + tab.color
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.value === "euler" && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">
                  {eulerCount}
                </Badge>
              )}
              {tab.value === "silo" && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-0.5">
                  {siloCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Stats — uses protocolFiltered, NOT search-filtered markets */}
      <MarketStats
        markets={protocolFiltered}
        isLoading={isLoading}
        protocol={protocol}
      />

      {/* Filters */}
      {protocolFiltered.length > 0 && (
        <MarketFilter
          search={search}
          onSearchChange={setSearch}
          searchMode={searchMode}
          onSearchModeChange={setSearchMode}
          selectedAsset={selectedAsset}
          onAssetChange={setSelectedAsset}
          markets={protocolFiltered}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {/* Table */}
      <VaultTable markets={filteredMarkets} isLoading={isLoading} />
    </div>
  );
}
