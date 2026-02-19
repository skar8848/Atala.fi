"use client";

import { useEulerVaults, type VaultData } from "./useEulerVaults";
import { useSiloMarkets, type SiloMarketData } from "./useSiloMarkets";
import { useVaultDiscovery } from "./useVaultDiscovery";

export type Protocol = "euler" | "silo" | "all";

export interface UnifiedMarket {
  id: string; // vault address or market id
  protocol: "euler" | "silo";
  name: string;
  asset: string; // loan token symbol
  assetDecimals: number;
  collateral?: string; // silo
  totalSupply: bigint;
  totalBorrows: bigint;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  // Euler-specific
  eulerData?: VaultData;
  // Silo-specific
  siloData?: SiloMarketData;
}

export function useUnifiedMarkets() {
  const { vaultAddresses } = useVaultDiscovery();
  const {
    vaults: eulerVaults,
    isLoading: eulerLoading,
    error: eulerError,
  } = useEulerVaults(vaultAddresses);

  const {
    markets: siloRawMarkets,
    isLoading: siloLoading,
    error: siloError,
  } = useSiloMarkets();

  // Convert Euler vaults to unified format
  const eulerUnified: UnifiedMarket[] = eulerVaults.map((v) => ({
    id: v.address,
    protocol: "euler" as const,
    name: v.name,
    asset: v.assetSymbol,
    assetDecimals: v.assetDecimals,
    totalSupply: v.totalAssets,
    totalBorrows: v.totalBorrows,
    supplyAPY: v.supplyAPY,
    borrowAPY: v.borrowAPY,
    utilization: v.utilization,
    eulerData: v,
  }));

  // Convert Silo markets to unified format
  const siloUnified: UnifiedMarket[] = siloRawMarkets.map((s) => ({
    id: s.id,
    protocol: "silo" as const,
    name: `${s.token0Symbol} / ${s.token1Symbol}`,
    asset: s.token1Symbol,
    assetDecimals: s.token1Decimals,
    collateral: s.token0Symbol,
    totalSupply: s.totalDeposits1,
    totalBorrows: s.totalBorrows1,
    supplyAPY: s.supplyAPY1,
    borrowAPY: s.borrowAPY1,
    utilization: s.utilization1,
    siloData: s,
  }));

  const allMarkets = [...siloUnified, ...eulerUnified];

  return {
    markets: allMarkets,
    eulerMarkets: eulerUnified,
    siloMarkets: siloUnified,
    isLoading: eulerLoading || siloLoading,
    eulerCount: eulerVaults.length,
    siloCount: siloRawMarkets.length,
    error: eulerError || siloError,
  };
}
