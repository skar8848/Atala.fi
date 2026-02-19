"use client";

import { useAccount, useReadContracts } from "wagmi";
import { evkVaultAbi } from "@/config/abis";
import { getTokenByAddress } from "@/config/contracts";
import { interestRateToAPY, calcUtilization } from "@/lib/format";

export interface PositionData {
  vaultAddress: `0x${string}`;
  vaultName: string;
  vaultSymbol: string;
  assetAddress: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  shares: bigint;
  assetsValue: bigint;
  debt: bigint;
  supplyAPY: number;
  borrowAPY: number;
}

export function usePortfolio(vaultAddresses: `0x${string}`[]) {
  const { address: userAddress } = useAccount();

  // For each vault, read: balanceOf, debtOf, convertToAssets(balanceOf), name, symbol, asset, interestRate, totalAssets, totalBorrows
  const contracts = vaultAddresses.flatMap((vault) => [
    {
      address: vault,
      abi: evkVaultAbi,
      functionName: "balanceOf",
      args: [userAddress!],
    } as const,
    {
      address: vault,
      abi: evkVaultAbi,
      functionName: "debtOf",
      args: [userAddress!],
    } as const,
    { address: vault, abi: evkVaultAbi, functionName: "name" } as const,
    { address: vault, abi: evkVaultAbi, functionName: "symbol" } as const,
    { address: vault, abi: evkVaultAbi, functionName: "asset" } as const,
    { address: vault, abi: evkVaultAbi, functionName: "interestRate" } as const,
    { address: vault, abi: evkVaultAbi, functionName: "totalAssets" } as const,
    { address: vault, abi: evkVaultAbi, functionName: "totalBorrows" } as const,
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: !!userAddress && vaultAddresses.length > 0,
      staleTime: 15_000,
    },
  });

  const positions: PositionData[] = [];

  if (data && userAddress) {
    const FIELDS_PER_VAULT = 8;

    for (let i = 0; i < vaultAddresses.length; i++) {
      const offset = i * FIELDS_PER_VAULT;
      const balanceResult = data[offset];
      const debtResult = data[offset + 1];
      const nameResult = data[offset + 2];
      const symbolResult = data[offset + 3];
      const assetResult = data[offset + 4];
      const rateResult = data[offset + 5];
      const totalAssetsResult = data[offset + 6];
      const totalBorrowsResult = data[offset + 7];

      const shares =
        balanceResult?.status === "success"
          ? (balanceResult.result as bigint)
          : 0n;
      const debt =
        debtResult?.status === "success"
          ? (debtResult.result as bigint)
          : 0n;

      // Only include positions where user has shares or debt
      if (shares === 0n && debt === 0n) continue;

      const assetAddress =
        assetResult?.status === "success"
          ? (assetResult.result as `0x${string}`)
          : ("0x0" as `0x${string}`);
      const tokenMeta = getTokenByAddress(assetAddress);
      const interestRate =
        rateResult?.status === "success"
          ? (rateResult.result as bigint)
          : 0n;
      const totalAssets =
        totalAssetsResult?.status === "success"
          ? (totalAssetsResult.result as bigint)
          : 0n;
      const totalBorrows =
        totalBorrowsResult?.status === "success"
          ? (totalBorrowsResult.result as bigint)
          : 0n;

      const borrowAPY = interestRateToAPY(interestRate);
      const utilization = calcUtilization(totalBorrows, totalAssets + totalBorrows);
      const supplyAPY = borrowAPY * (utilization / 100);

      positions.push({
        vaultAddress: vaultAddresses[i],
        vaultName:
          nameResult?.status === "success"
            ? (nameResult.result as string)
            : "Unknown",
        vaultSymbol:
          symbolResult?.status === "success"
            ? (symbolResult.result as string)
            : "???",
        assetAddress,
        assetSymbol: tokenMeta?.symbol ?? "???",
        assetDecimals: tokenMeta?.decimals ?? 18,
        shares,
        assetsValue: shares, // Simplified: need convertToAssets for exact value
        debt,
        supplyAPY,
        borrowAPY,
      });
    }
  }

  return { positions, isLoading, error, refetch, isConnected: !!userAddress };
}
