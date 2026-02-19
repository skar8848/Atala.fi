"use client";

import { useReadContracts } from "wagmi";
import { evkVaultAbi, erc20Abi } from "@/config/abis";
import { getTokenByAddress } from "@/config/contracts";
import { interestRateToAPY, calcUtilization } from "@/lib/format";

export interface VaultData {
  address: `0x${string}`;
  name: string;
  symbol: string;
  asset: `0x${string}`;
  assetSymbol: string;
  assetName: string;
  assetDecimals: number;
  totalAssets: bigint;
  totalBorrows: bigint;
  interestRate: bigint;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
  supplyCap: number;
  borrowCap: number;
}

export function useEulerVaults(vaultAddresses: `0x${string}`[]) {
  // Build multicall for all vault data
  const contracts = vaultAddresses.flatMap((address) => [
    { address, abi: evkVaultAbi, functionName: "name" } as const,
    { address, abi: evkVaultAbi, functionName: "symbol" } as const,
    { address, abi: evkVaultAbi, functionName: "asset" } as const,
    { address, abi: evkVaultAbi, functionName: "totalAssets" } as const,
    { address, abi: evkVaultAbi, functionName: "totalBorrows" } as const,
    { address, abi: evkVaultAbi, functionName: "interestRate" } as const,
    { address, abi: evkVaultAbi, functionName: "caps" } as const,
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: vaultAddresses.length > 0,
      staleTime: 30_000,
    },
  });

  // Collect unknown asset addresses for the fallback read
  const unknownAssets: `0x${string}`[] = [];
  if (data) {
    const FIELDS_PER_VAULT = 7;
    for (let i = 0; i < vaultAddresses.length; i++) {
      const offset = i * FIELDS_PER_VAULT;
      const assetResult = data[offset + 2];
      if (assetResult?.status === "success") {
        const addr = assetResult.result as `0x${string}`;
        if (!getTokenByAddress(addr) && !unknownAssets.includes(addr)) {
          unknownAssets.push(addr);
        }
      }
    }
  }

  // Step 2: Read symbol() and decimals() for unknown tokens
  const fallbackContracts = unknownAssets.flatMap((address) => [
    { address, abi: erc20Abi, functionName: "symbol" as const },
    { address, abi: erc20Abi, functionName: "decimals" as const },
  ]);

  const { data: fallbackData } = useReadContracts({
    contracts: fallbackContracts,
    query: {
      enabled: unknownAssets.length > 0,
      staleTime: 300_000, // cache longer, symbols don't change
    },
  });

  // Build a lookup for fallback tokens
  const fallbackLookup = new Map<string, { symbol: string; decimals: number }>();
  if (fallbackData) {
    for (let i = 0; i < unknownAssets.length; i++) {
      const symbolResult = fallbackData[i * 2];
      const decimalsResult = fallbackData[i * 2 + 1];
      const symbol = symbolResult?.status === "success" ? (symbolResult.result as string) : "???";
      const decimals = decimalsResult?.status === "success" ? Number(decimalsResult.result) : 18;
      fallbackLookup.set(unknownAssets[i].toLowerCase(), { symbol, decimals });
    }
  }

  const vaults: VaultData[] = [];

  if (data) {
    const FIELDS_PER_VAULT = 7;

    for (let i = 0; i < vaultAddresses.length; i++) {
      const offset = i * FIELDS_PER_VAULT;
      const nameResult = data[offset];
      const symbolResult = data[offset + 1];
      const assetResult = data[offset + 2];
      const totalAssetsResult = data[offset + 3];
      const totalBorrowsResult = data[offset + 4];
      const interestRateResult = data[offset + 5];
      const capsResult = data[offset + 6];

      // Skip vaults with errors
      if (
        nameResult?.status !== "success" ||
        assetResult?.status !== "success" ||
        totalAssetsResult?.status !== "success"
      ) {
        continue;
      }

      const assetAddress = assetResult.result as `0x${string}`;
      const tokenMeta = getTokenByAddress(assetAddress);
      const fallback = fallbackLookup.get(assetAddress.toLowerCase());
      const totalAssets = (totalAssetsResult.result as bigint) ?? 0n;
      const totalBorrows =
        totalBorrowsResult?.status === "success"
          ? (totalBorrowsResult.result as bigint)
          : 0n;
      const interestRate =
        interestRateResult?.status === "success"
          ? (interestRateResult.result as bigint)
          : 0n;
      const caps =
        capsResult?.status === "success"
          ? (capsResult.result as [number, number])
          : [0, 0];

      // totalAssets from EVK = cash only (deposits - borrows)
      // Real total deposited = cash + totalBorrows
      const totalDeposited = totalAssets + totalBorrows;

      const borrowAPY = interestRateToAPY(interestRate);
      const utilization = calcUtilization(totalBorrows, totalDeposited);
      // Supply APY = borrow APY * utilization
      const supplyAPY = borrowAPY * (utilization / 100);

      vaults.push({
        address: vaultAddresses[i],
        name: (nameResult.result as string) ?? "Unknown Vault",
        symbol: (symbolResult?.result as string) ?? "???",
        asset: assetAddress,
        assetSymbol: tokenMeta?.symbol ?? fallback?.symbol ?? "???",
        assetName: tokenMeta?.name ?? fallback?.symbol ?? "Unknown",
        assetDecimals: tokenMeta?.decimals ?? fallback?.decimals ?? 18,
        totalAssets: totalDeposited,
        totalBorrows,
        interestRate,
        supplyAPY,
        borrowAPY,
        utilization,
        supplyCap: caps[0],
        borrowCap: caps[1],
      });
    }
  }

  return { vaults, isLoading, error, refetch };
}
