"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { evkVaultAbi } from "@/config/abis";
import { ALL_VAULT_ADDRESSES } from "@/hooks/useVaultDiscovery";
import { SILO_MARKET_CONFIGS, siloConfigAbi, siloAbi } from "@/config/silo";
import { getTokenByAddress } from "@/config/contracts";
import type {
  EulerPosition,
  SiloPosition,
  EulerVaultInfo,
  SiloPairInfo,
  TokenInfo,
} from "@/lib/canvas/types";

interface AddressPositionsResult {
  eulerPositions: EulerPosition[];
  siloPositions: SiloPosition[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetch all Euler V2 + Silo V2 positions for a given address.
 */
export function useAddressPositions(
  address: string | null
): AddressPositionsResult {
  // --- Euler V2: balanceOf + debtOf for each vault ---
  const eulerContracts = useMemo(() => {
    if (!address) return [];
    return ALL_VAULT_ADDRESSES.flatMap((vault) => [
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`] as const,
      },
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "debtOf" as const,
        args: [address as `0x${string}`] as const,
      },
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "name" as const,
      },
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "symbol" as const,
      },
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "asset" as const,
      },
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "totalAssets" as const,
      },
      {
        address: vault,
        abi: evkVaultAbi,
        functionName: "totalBorrows" as const,
      },
    ]);
  }, [address]);

  const { data: eulerData, isLoading: eulerLoading } = useReadContracts({
    contracts: eulerContracts.length > 0 ? eulerContracts : undefined,
    query: { enabled: !!address && eulerContracts.length > 0, staleTime: 30_000 },
  });

  const eulerPositions: EulerPosition[] = useMemo(() => {
    if (!eulerData) return [];
    const positions: EulerPosition[] = [];
    const FIELDS = 7;

    for (let i = 0; i < ALL_VAULT_ADDRESSES.length; i++) {
      const offset = i * FIELDS;
      const balanceResult = eulerData[offset];
      const debtResult = eulerData[offset + 1];
      const nameResult = eulerData[offset + 2];
      const symbolResult = eulerData[offset + 3];
      const assetResult = eulerData[offset + 4];
      const totalAssetsResult = eulerData[offset + 5];
      const totalBorrowsResult = eulerData[offset + 6];

      const balance = balanceResult?.status === "success" ? (balanceResult.result as bigint) : 0n;
      const debt = debtResult?.status === "success" ? (debtResult.result as bigint) : 0n;

      if (balance === 0n && debt === 0n) continue;

      const assetAddr = assetResult?.status === "success" ? (assetResult.result as string) : "";
      const tokenMeta = getTokenByAddress(assetAddr);

      const vaultInfo: EulerVaultInfo = {
        address: ALL_VAULT_ADDRESSES[i],
        name: nameResult?.status === "success" ? (nameResult.result as string) : "Unknown",
        symbol: symbolResult?.status === "success" ? (symbolResult.result as string) : "???",
        asset: {
          address: assetAddr,
          symbol: tokenMeta?.symbol ?? "???",
          name: tokenMeta?.name ?? "Unknown",
          decimals: tokenMeta?.decimals ?? 18,
        },
        totalAssets: totalAssetsResult?.status === "success" ? (totalAssetsResult.result as bigint) : 0n,
        totalBorrows: totalBorrowsResult?.status === "success" ? (totalBorrowsResult.result as bigint) : 0n,
        supplyAPY: 0,
        borrowAPY: 0,
        utilization: 0,
      };

      positions.push({
        vault: vaultInfo,
        supplyShares: balance,
        supplyAssets: balance, // simplified: shares ≈ assets for display
        borrowShares: 0n,
        borrowAssets: debt,
      });
    }

    return positions;
  }, [eulerData]);

  // --- Silo V2: Read pairs, then balanceOf for each silo ---
  const siloPairContracts = useMemo(() => {
    if (!address) return [];
    return SILO_MARKET_CONFIGS.map((config) => ({
      address: config,
      abi: siloConfigAbi,
      functionName: "getSilos" as const,
    }));
  }, [address]);

  const { data: siloPairData, isLoading: siloLoading } = useReadContracts({
    contracts: siloPairContracts.length > 0 ? siloPairContracts : undefined,
    query: { enabled: !!address && siloPairContracts.length > 0, staleTime: 60_000 },
  });

  // Get silo addresses
  const siloAddresses = useMemo(() => {
    if (!siloPairData) return [];
    return siloPairData.map((result, i) => {
      if (result?.status !== "success") return null;
      const [silo0, silo1] = result.result as [string, string];
      return { config: SILO_MARKET_CONFIGS[i], silo0, silo1 };
    }).filter(Boolean) as { config: string; silo0: string; silo1: string }[];
  }, [siloPairData]);

  // Read balanceOf for each silo pair
  const siloBalanceContracts = useMemo(() => {
    if (!address || siloAddresses.length === 0) return [];
    return siloAddresses.flatMap(({ silo0, silo1 }) => [
      {
        address: silo0 as `0x${string}`,
        abi: siloAbi,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`] as const,
      },
      {
        address: silo1 as `0x${string}`,
        abi: siloAbi,
        functionName: "balanceOf" as const,
        args: [address as `0x${string}`] as const,
      },
      {
        address: silo0 as `0x${string}`,
        abi: siloAbi,
        functionName: "asset" as const,
      },
      {
        address: silo1 as `0x${string}`,
        abi: siloAbi,
        functionName: "asset" as const,
      },
    ]);
  }, [address, siloAddresses]);

  const { data: siloBalanceData } = useReadContracts({
    contracts: siloBalanceContracts.length > 0 ? siloBalanceContracts : undefined,
    query: { enabled: siloBalanceContracts.length > 0, staleTime: 30_000 },
  });

  const siloPositions: SiloPosition[] = useMemo(() => {
    if (!siloBalanceData || siloAddresses.length === 0) return [];
    const positions: SiloPosition[] = [];

    for (let i = 0; i < siloAddresses.length; i++) {
      const offset = i * 4;
      const bal0 = siloBalanceData[offset]?.status === "success" ? (siloBalanceData[offset].result as bigint) : 0n;
      const bal1 = siloBalanceData[offset + 1]?.status === "success" ? (siloBalanceData[offset + 1].result as bigint) : 0n;
      const asset0 = siloBalanceData[offset + 2]?.status === "success" ? (siloBalanceData[offset + 2].result as string) : "";
      const asset1 = siloBalanceData[offset + 3]?.status === "success" ? (siloBalanceData[offset + 3].result as string) : "";

      const { config, silo0, silo1 } = siloAddresses[i];
      const token0Meta = getTokenByAddress(asset0);
      const token1Meta = getTokenByAddress(asset1);

      const pairInfo: SiloPairInfo = {
        configAddress: config,
        silo0,
        silo1,
        token0: {
          address: asset0,
          symbol: token0Meta?.symbol ?? "???",
          name: token0Meta?.name ?? "Unknown",
          decimals: token0Meta?.decimals ?? 18,
        },
        token1: {
          address: asset1,
          symbol: token1Meta?.symbol ?? "???",
          name: token1Meta?.name ?? "Unknown",
          decimals: token1Meta?.decimals ?? 18,
        },
        totalDeposits0: 0n,
        totalDeposits1: 0n,
        totalBorrows0: 0n,
        totalBorrows1: 0n,
        supplyAPY0: 0,
        supplyAPY1: 0,
        borrowAPY0: 0,
        borrowAPY1: 0,
        utilization0: 0,
        utilization1: 0,
      };

      if (bal0 > 0n) {
        positions.push({
          pair: pairInfo,
          side: 0,
          depositAssets: bal0,
          borrowAssets: 0n,
        });
      }
      if (bal1 > 0n) {
        positions.push({
          pair: pairInfo,
          side: 1,
          depositAssets: bal1,
          borrowAssets: 0n,
        });
      }
    }

    return positions;
  }, [siloBalanceData, siloAddresses]);

  return {
    eulerPositions,
    siloPositions,
    loading: eulerLoading || siloLoading,
    error: null,
  };
}
