"use client";

import { useReadContracts } from "wagmi";
import { atalaFactoryAbi, atalaVaultAbi } from "@/config/atala";
import { erc20Abi } from "@/config/abis";
import { getTokenByAddress } from "@/config/contracts";
import { useFactoryAddress } from "./useFactoryAddress";

export interface AtalaVaultData {
  address: `0x${string}`;
  name: string;
  symbol: string;
  asset: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  totalAssets: bigint;
  idle: bigint;
  vaultCount: number;
  owner: `0x${string}`;
  curator: `0x${string}`;
  allocator: `0x${string}`;
  sentinel: `0x${string}`;
}

const FIELDS_PER_VAULT = 10;

export function useAtalaVaults(deployer: `0x${string}` | undefined) {
  const { factoryAddress } = useFactoryAddress();

  // Step 1: Get vault addresses from factory
  const { data: vaultAddressesData } = useReadContracts({
    contracts: deployer && factoryAddress
      ? [
          {
            address: factoryAddress,
            abi: atalaFactoryAbi,
            functionName: "getVaultsByDeployer",
            args: [deployer],
          },
        ]
      : [],
    query: {
      enabled: !!deployer && !!factoryAddress,
      staleTime: 30_000,
    },
  });

  const vaultAddresses: `0x${string}`[] =
    vaultAddressesData?.[0]?.status === "success"
      ? (vaultAddressesData[0].result as `0x${string}`[])
      : [];

  // Step 2: Multicall for vault details
  const detailContracts = vaultAddresses.flatMap((address) => [
    { address, abi: atalaVaultAbi, functionName: "name" } as const,
    { address, abi: atalaVaultAbi, functionName: "symbol" } as const,
    { address, abi: atalaVaultAbi, functionName: "asset" } as const,
    { address, abi: atalaVaultAbi, functionName: "totalAssets" } as const,
    { address, abi: atalaVaultAbi, functionName: "idle" } as const,
    { address, abi: atalaVaultAbi, functionName: "vaultCount" } as const,
    { address, abi: atalaVaultAbi, functionName: "owner" } as const,
    { address, abi: atalaVaultAbi, functionName: "curator" } as const,
    { address, abi: atalaVaultAbi, functionName: "allocator" } as const,
    { address, abi: atalaVaultAbi, functionName: "sentinel" } as const,
  ]);

  const { data: detailData, isLoading: isLoadingDetails, refetch } = useReadContracts({
    contracts: detailContracts,
    query: {
      enabled: vaultAddresses.length > 0,
      staleTime: 30_000,
    },
  });

  // Collect unknown asset addresses for fallback
  const unknownAssets: `0x${string}`[] = [];
  if (detailData) {
    for (let i = 0; i < vaultAddresses.length; i++) {
      const offset = i * FIELDS_PER_VAULT;
      const assetResult = detailData[offset + 2];
      if (assetResult?.status === "success") {
        const addr = assetResult.result as `0x${string}`;
        if (!getTokenByAddress(addr) && !unknownAssets.includes(addr)) {
          unknownAssets.push(addr);
        }
      }
    }
  }

  // Step 3: Fallback reads for unknown tokens
  const { data: fallbackData } = useReadContracts({
    contracts: unknownAssets.flatMap((address) => [
      { address, abi: erc20Abi, functionName: "symbol" as const },
      { address, abi: erc20Abi, functionName: "decimals" as const },
    ]),
    query: {
      enabled: unknownAssets.length > 0,
      staleTime: 300_000,
    },
  });

  const fallbackLookup = new Map<string, { symbol: string; decimals: number }>();
  if (fallbackData) {
    for (let i = 0; i < unknownAssets.length; i++) {
      const sym = fallbackData[i * 2];
      const dec = fallbackData[i * 2 + 1];
      fallbackLookup.set(unknownAssets[i].toLowerCase(), {
        symbol: sym?.status === "success" ? (sym.result as string) : "???",
        decimals: dec?.status === "success" ? Number(dec.result) : 18,
      });
    }
  }

  // Step 4: Build vault array
  const vaults: AtalaVaultData[] = [];

  if (detailData) {
    for (let i = 0; i < vaultAddresses.length; i++) {
      const offset = i * FIELDS_PER_VAULT;
      const nameResult = detailData[offset];
      const symbolResult = detailData[offset + 1];
      const assetResult = detailData[offset + 2];
      const totalAssetsResult = detailData[offset + 3];
      const idleResult = detailData[offset + 4];
      const vaultCountResult = detailData[offset + 5];
      const ownerResult = detailData[offset + 6];
      const curatorResult = detailData[offset + 7];
      const allocatorResult = detailData[offset + 8];
      const sentinelResult = detailData[offset + 9];

      if (nameResult?.status !== "success" || assetResult?.status !== "success") continue;

      const assetAddress = assetResult.result as `0x${string}`;
      const tokenMeta = getTokenByAddress(assetAddress);
      const fallback = fallbackLookup.get(assetAddress.toLowerCase());

      vaults.push({
        address: vaultAddresses[i],
        name: (nameResult.result as string) ?? "Unknown Vault",
        symbol: (symbolResult?.result as string) ?? "???",
        asset: assetAddress,
        assetSymbol: tokenMeta?.symbol ?? fallback?.symbol ?? "???",
        assetDecimals: tokenMeta?.decimals ?? fallback?.decimals ?? 18,
        totalAssets: totalAssetsResult?.status === "success" ? (totalAssetsResult.result as bigint) : 0n,
        idle: idleResult?.status === "success" ? (idleResult.result as bigint) : 0n,
        vaultCount: vaultCountResult?.status === "success" ? Number(vaultCountResult.result) : 0,
        owner: ownerResult?.status === "success" ? (ownerResult.result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
        curator: curatorResult?.status === "success" ? (curatorResult.result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
        allocator: allocatorResult?.status === "success" ? (allocatorResult.result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
        sentinel: sentinelResult?.status === "success" ? (sentinelResult.result as `0x${string}`) : "0x0000000000000000000000000000000000000000",
      });
    }
  }

  const isLoading = !deployer ? false : isLoadingDetails;

  return { vaults, isLoading, refetch };
}
