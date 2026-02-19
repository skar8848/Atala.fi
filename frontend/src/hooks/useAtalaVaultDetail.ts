"use client";

import { useReadContracts } from "wagmi";
import { atalaVaultAbi } from "@/config/atala";
import { evkVaultAbi, erc20Abi } from "@/config/abis";
import { getTokenByAddress } from "@/config/contracts";

export interface SubVaultData {
  address: `0x${string}`;
  name: string;
  cap: bigint;
  enabled: boolean;
  allocation: bigint;
}

export interface AtalaVaultDetail {
  address: `0x${string}`;
  name: string;
  symbol: string;
  asset: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  totalAssets: bigint;
  idle: bigint;
  owner: `0x${string}`;
  curator: `0x${string}`;
  allocator: `0x${string}`;
  sentinel: `0x${string}`;
  subVaults: SubVaultData[];
  supplyQueue: `0x${string}`[];
  withdrawQueue: `0x${string}`[];
}

export function useAtalaVaultDetail(address: `0x${string}` | undefined) {
  // Step 1: Read basic info + vault list + queues
  const basicContracts = address
    ? [
        { address, abi: atalaVaultAbi, functionName: "name" } as const,
        { address, abi: atalaVaultAbi, functionName: "symbol" } as const,
        { address, abi: atalaVaultAbi, functionName: "asset" } as const,
        { address, abi: atalaVaultAbi, functionName: "totalAssets" } as const,
        { address, abi: atalaVaultAbi, functionName: "idle" } as const,
        { address, abi: atalaVaultAbi, functionName: "owner" } as const,
        { address, abi: atalaVaultAbi, functionName: "curator" } as const,
        { address, abi: atalaVaultAbi, functionName: "allocator" } as const,
        { address, abi: atalaVaultAbi, functionName: "sentinel" } as const,
        { address, abi: atalaVaultAbi, functionName: "getVaults" } as const,
        { address, abi: atalaVaultAbi, functionName: "getSupplyQueue" } as const,
        { address, abi: atalaVaultAbi, functionName: "getWithdrawQueue" } as const,
      ]
    : [];

  const { data: basicData, isLoading: isLoadingBasic, refetch } = useReadContracts({
    contracts: basicContracts,
    query: {
      enabled: !!address,
      staleTime: 15_000,
    },
  });

  // Extract sub-vault addresses
  const subVaultAddresses: `0x${string}`[] =
    basicData?.[9]?.status === "success"
      ? (basicData[9].result as `0x${string}`[])
      : [];

  // Step 2: Read per-sub-vault data (config, allocation, name)
  const subVaultContracts = address
    ? subVaultAddresses.flatMap((sv) => [
        { address: address!, abi: atalaVaultAbi, functionName: "vaultConfig", args: [sv] } as const,
        { address: address!, abi: atalaVaultAbi, functionName: "vaultAllocation", args: [sv] } as const,
        { address: sv, abi: evkVaultAbi, functionName: "name" } as const,
      ])
    : [];

  const { data: subVaultData, isLoading: isLoadingSubVaults } = useReadContracts({
    contracts: subVaultContracts,
    query: {
      enabled: subVaultAddresses.length > 0,
      staleTime: 15_000,
    },
  });

  // Resolve asset token info
  const assetAddress =
    basicData?.[2]?.status === "success"
      ? (basicData[2].result as `0x${string}`)
      : undefined;

  const tokenMeta = assetAddress ? getTokenByAddress(assetAddress) : undefined;

  // Fallback for unknown asset
  const { data: assetFallback } = useReadContracts({
    contracts: assetAddress && !tokenMeta
      ? [
          { address: assetAddress, abi: erc20Abi, functionName: "symbol" as const },
          { address: assetAddress, abi: erc20Abi, functionName: "decimals" as const },
        ]
      : [],
    query: {
      enabled: !!assetAddress && !tokenMeta,
      staleTime: 300_000,
    },
  });

  const assetSymbol =
    tokenMeta?.symbol ??
    (assetFallback?.[0]?.status === "success" ? (assetFallback[0].result as string) : "???");
  const assetDecimals =
    tokenMeta?.decimals ??
    (assetFallback?.[1]?.status === "success" ? Number(assetFallback[1].result) : 18);

  // Build sub-vault data
  const subVaults: SubVaultData[] = [];
  if (subVaultData) {
    const FIELDS = 3;
    for (let i = 0; i < subVaultAddresses.length; i++) {
      const offset = i * FIELDS;
      const configResult = subVaultData[offset];
      const allocationResult = subVaultData[offset + 1];
      const nameResult = subVaultData[offset + 2];

      const config =
        configResult?.status === "success"
          ? (configResult.result as [bigint, boolean, bigint])
          : [0n, false, 0n] as [bigint, boolean, bigint];

      subVaults.push({
        address: subVaultAddresses[i],
        name: nameResult?.status === "success" ? (nameResult.result as string) : "Unknown",
        cap: config[0],
        enabled: config[1],
        allocation: allocationResult?.status === "success" ? (allocationResult.result as bigint) : 0n,
      });
    }
  }

  const supplyQueue: `0x${string}`[] =
    basicData?.[10]?.status === "success"
      ? (basicData[10].result as `0x${string}`[])
      : [];

  const withdrawQueue: `0x${string}`[] =
    basicData?.[11]?.status === "success"
      ? (basicData[11].result as `0x${string}`[])
      : [];

  const vault: AtalaVaultDetail | null =
    basicData && basicData[0]?.status === "success"
      ? {
          address: address!,
          name: basicData[0].result as string,
          symbol: basicData[1]?.status === "success" ? (basicData[1].result as string) : "???",
          asset: assetAddress ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
          assetSymbol,
          assetDecimals,
          totalAssets: basicData[3]?.status === "success" ? (basicData[3].result as bigint) : 0n,
          idle: basicData[4]?.status === "success" ? (basicData[4].result as bigint) : 0n,
          owner: basicData[5]?.status === "success" ? (basicData[5].result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
          curator: basicData[6]?.status === "success" ? (basicData[6].result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
          allocator: basicData[7]?.status === "success" ? (basicData[7].result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
          sentinel: basicData[8]?.status === "success" ? (basicData[8].result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
          subVaults,
          supplyQueue,
          withdrawQueue,
        }
      : null;

  return {
    vault,
    isLoading: isLoadingBasic || isLoadingSubVaults,
    refetch,
  };
}
