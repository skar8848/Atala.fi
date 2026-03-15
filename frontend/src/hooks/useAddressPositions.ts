"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { usePublicClient } from "wagmi";
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
 * Uses publicClient.multicall() so it works without a connected wallet.
 */
export function useAddressPositions(
  address: string | null
): AddressPositionsResult {
  const publicClient = usePublicClient();
  const [eulerPositions, setEulerPositions] = useState<EulerPosition[]>([]);
  const [siloPositions, setSiloPositions] = useState<SiloPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track current fetch to avoid stale results
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!address || !publicClient) {
      setEulerPositions([]);
      setSiloPositions([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchId = ++fetchIdRef.current;
    let cancelled = false;
    const client = publicClient;

    async function fetchAll() {
      setLoading(true);
      setError(null);

      try {
        // --- Euler V2: batch-read balanceOf, debtOf, name, symbol, asset, totalAssets, totalBorrows ---
        const FIELDS = 7;
        const eulerCalls = ALL_VAULT_ADDRESSES.flatMap((vault) => [
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

        const eulerData = await client.multicall({
          contracts: eulerCalls as Parameters<typeof client.multicall>[0]["contracts"],
          allowFailure: true,
        });

        if (cancelled) return;

        const eulerResults: EulerPosition[] = [];
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

          eulerResults.push({
            vault: vaultInfo,
            supplyShares: balance,
            supplyAssets: balance,
            borrowShares: 0n,
            borrowAssets: debt,
          });
        }

        if (cancelled) return;
        setEulerPositions(eulerResults);

        // --- Silo V2: First read getSilos() for each config ---
        const siloConfigCalls = SILO_MARKET_CONFIGS.map((config) => ({
          address: config,
          abi: siloConfigAbi,
          functionName: "getSilos" as const,
        }));

        const siloPairData = await client.multicall({
          contracts: siloConfigCalls as Parameters<typeof client.multicall>[0]["contracts"],
          allowFailure: true,
        });

        if (cancelled) return;

        // Parse silo addresses
        const siloAddresses: { config: `0x${string}`; silo0: string; silo1: string }[] = [];
        for (let i = 0; i < SILO_MARKET_CONFIGS.length; i++) {
          const result = siloPairData[i];
          if (result?.status !== "success") continue;
          const [silo0, silo1] = result.result as [string, string];
          siloAddresses.push({ config: SILO_MARKET_CONFIGS[i], silo0, silo1 });
        }

        if (siloAddresses.length === 0) {
          if (!cancelled) setSiloPositions([]);
          if (!cancelled) setLoading(false);
          return;
        }

        // Read balanceOf + asset for each silo
        const siloBalanceCalls = siloAddresses.flatMap(({ silo0, silo1 }) => [
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

        const siloBalanceData = await client.multicall({
          contracts: siloBalanceCalls as Parameters<typeof client.multicall>[0]["contracts"],
          allowFailure: true,
        });

        if (cancelled) return;

        const siloResults: SiloPosition[] = [];
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
            siloResults.push({
              pair: pairInfo,
              side: 0,
              depositAssets: bal0,
              borrowAssets: 0n,
            });
          }
          if (bal1 > 0n) {
            siloResults.push({
              pair: pairInfo,
              side: 1,
              depositAssets: bal1,
              borrowAssets: 0n,
            });
          }
        }

        if (!cancelled) {
          setSiloPositions(siloResults);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to fetch positions");
          setLoading(false);
        }
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  return {
    eulerPositions,
    siloPositions,
    loading,
    error,
  };
}
