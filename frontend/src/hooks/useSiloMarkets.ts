"use client";

import { useReadContracts } from "wagmi";
import {
  SILO_ADDRESSES,
  SILO_MARKET_CONFIGS,
  siloConfigAbi,
  siloAbi,
  siloLensAbi,
} from "@/config/silo";
import { erc20Abi } from "@/config/abis";
import { getTokenByAddress } from "@/config/contracts";

export interface SiloMarketData {
  id: string; // SiloConfig address
  silo0: `0x${string}`;
  silo1: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  // Silo0 data (token0 side)
  totalDeposits0: bigint;
  totalBorrows0: bigint;
  supplyAPY0: number;
  borrowAPY0: number;
  utilization0: number;
  // Silo1 data (token1 side)
  totalDeposits1: bigint;
  totalBorrows1: bigint;
  supplyAPY1: number;
  borrowAPY1: number;
  utilization1: number;
  protocol: "silo";
}

// Step 1: Read silo0/silo1 addresses from each SiloConfig
function useSiloPairs() {
  const contracts = SILO_MARKET_CONFIGS.map((config) => ({
    address: config,
    abi: siloConfigAbi,
    functionName: "getSilos" as const,
  }));

  const { data, isLoading, error } = useReadContracts({
    contracts,
    query: {
      staleTime: 60_000,
      enabled: SILO_MARKET_CONFIGS.length > 0,
    },
  });

  const pairs: { config: `0x${string}`; silo0: `0x${string}`; silo1: `0x${string}` }[] = [];

  if (data) {
    for (let i = 0; i < SILO_MARKET_CONFIGS.length; i++) {
      const result = data[i];
      if (result?.status === "success") {
        const [silo0, silo1] = result.result as [`0x${string}`, `0x${string}`];
        pairs.push({ config: SILO_MARKET_CONFIGS[i], silo0, silo1 });
      }
    }
  }

  return { pairs, isLoading, error };
}

// Step 2: Read market data for all silo pairs
export function useSiloMarkets() {
  const { pairs, isLoading: pairsLoading, error: pairsError } = useSiloPairs();

  const lensAddress = SILO_ADDRESSES.SILO_LENS as `0x${string}`;

  // Build multicall: for each pair, read asset + lens data for both silos
  const CALLS_PER_PAIR = 12;

  const contracts = pairs.flatMap(({ silo0, silo1 }) => [
    { address: silo0, abi: siloAbi, functionName: "asset" as const },
    { address: silo1, abi: siloAbi, functionName: "asset" as const },
    { address: lensAddress, abi: siloLensAbi, functionName: "totalDepositsWithInterest" as const, args: [silo0] },
    { address: lensAddress, abi: siloLensAbi, functionName: "totalDepositsWithInterest" as const, args: [silo1] },
    { address: lensAddress, abi: siloLensAbi, functionName: "totalBorrowAmountWithInterest" as const, args: [silo0] },
    { address: lensAddress, abi: siloLensAbi, functionName: "totalBorrowAmountWithInterest" as const, args: [silo1] },
    { address: lensAddress, abi: siloLensAbi, functionName: "getDepositAPR" as const, args: [silo0] },
    { address: lensAddress, abi: siloLensAbi, functionName: "getDepositAPR" as const, args: [silo1] },
    { address: lensAddress, abi: siloLensAbi, functionName: "getBorrowAPR" as const, args: [silo0] },
    { address: lensAddress, abi: siloLensAbi, functionName: "getBorrowAPR" as const, args: [silo1] },
    { address: lensAddress, abi: siloLensAbi, functionName: "getUtilization" as const, args: [silo0] },
    { address: lensAddress, abi: siloLensAbi, functionName: "getUtilization" as const, args: [silo1] },
  ]);

  const { data, isLoading: dataLoading, error: dataError } = useReadContracts({
    contracts,
    query: {
      enabled: pairs.length > 0,
      staleTime: 30_000,
    },
  });

  // Collect unknown asset addresses for fallback on-chain read
  const unknownAssets: `0x${string}`[] = [];
  if (data) {
    for (let i = 0; i < pairs.length; i++) {
      const offset = i * CALLS_PER_PAIR;
      for (const j of [0, 1]) {
        const assetResult = data[offset + j];
        if (assetResult?.status === "success") {
          const addr = assetResult.result as `0x${string}`;
          if (!getTokenByAddress(addr) && !unknownAssets.includes(addr)) {
            unknownAssets.push(addr);
          }
        }
      }
    }
  }

  // Step 3: Read symbol() and decimals() for unknown tokens
  const fallbackContracts = unknownAssets.flatMap((address) => [
    { address, abi: erc20Abi, functionName: "symbol" as const },
    { address, abi: erc20Abi, functionName: "decimals" as const },
  ]);

  const { data: fallbackData } = useReadContracts({
    contracts: fallbackContracts,
    query: {
      enabled: unknownAssets.length > 0,
      staleTime: 300_000,
    },
  });

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

  const markets: SiloMarketData[] = [];

  if (data) {
    for (let i = 0; i < pairs.length; i++) {
      const offset = i * CALLS_PER_PAIR;
      const pair = pairs[i];

      const asset0Result = data[offset];
      const asset1Result = data[offset + 1];
      const deposits0Result = data[offset + 2];
      const deposits1Result = data[offset + 3];
      const borrows0Result = data[offset + 4];
      const borrows1Result = data[offset + 5];
      const depositAPR0Result = data[offset + 6];
      const depositAPR1Result = data[offset + 7];
      const borrowAPR0Result = data[offset + 8];
      const borrowAPR1Result = data[offset + 9];
      const util0Result = data[offset + 10];
      const util1Result = data[offset + 11];

      if (asset0Result?.status !== "success" || asset1Result?.status !== "success") {
        continue;
      }

      const token0 = asset0Result.result as `0x${string}`;
      const token1 = asset1Result.result as `0x${string}`;
      const meta0 = getTokenByAddress(token0);
      const meta1 = getTokenByAddress(token1);
      const fb0 = fallbackLookup.get(token0.toLowerCase());
      const fb1 = fallbackLookup.get(token1.toLowerCase());

      const totalDeposits0 = deposits0Result?.status === "success" ? (deposits0Result.result as bigint) : 0n;
      const totalDeposits1 = deposits1Result?.status === "success" ? (deposits1Result.result as bigint) : 0n;
      const totalBorrows0 = borrows0Result?.status === "success" ? (borrows0Result.result as bigint) : 0n;
      const totalBorrows1 = borrows1Result?.status === "success" ? (borrows1Result.result as bigint) : 0n;

      // APRs are in 18 decimals (1e18 = 100%)
      const supplyAPY0 = depositAPR0Result?.status === "success"
        ? Number(depositAPR0Result.result as bigint) / 1e16
        : 0;
      const supplyAPY1 = depositAPR1Result?.status === "success"
        ? Number(depositAPR1Result.result as bigint) / 1e16
        : 0;
      const borrowAPY0 = borrowAPR0Result?.status === "success"
        ? Number(borrowAPR0Result.result as bigint) / 1e16
        : 0;
      const borrowAPY1 = borrowAPR1Result?.status === "success"
        ? Number(borrowAPR1Result.result as bigint) / 1e16
        : 0;

      // Utilization is in 18 decimals (1e18 = 100%)
      const utilization0 = util0Result?.status === "success"
        ? Number(util0Result.result as bigint) / 1e16
        : 0;
      const utilization1 = util1Result?.status === "success"
        ? Number(util1Result.result as bigint) / 1e16
        : 0;

      markets.push({
        id: pair.config,
        silo0: pair.silo0,
        silo1: pair.silo1,
        token0,
        token1,
        token0Symbol: meta0?.symbol ?? fb0?.symbol ?? "???",
        token1Symbol: meta1?.symbol ?? fb1?.symbol ?? "???",
        token0Decimals: meta0?.decimals ?? fb0?.decimals ?? 18,
        token1Decimals: meta1?.decimals ?? fb1?.decimals ?? 18,
        totalDeposits0,
        totalBorrows0,
        supplyAPY0,
        borrowAPY0,
        utilization0,
        totalDeposits1,
        totalBorrows1,
        supplyAPY1,
        borrowAPY1,
        utilization1,
        protocol: "silo",
      });
    }
  }

  return {
    markets,
    isLoading: pairsLoading || dataLoading,
    error: pairsError || dataError,
  };
}
