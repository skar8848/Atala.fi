"use client";

import { useReadContracts } from "wagmi";
import { MORPHO_ADDRESSES, morphoBlueAbi } from "@/config/morpho";
import { getTokenByAddress } from "@/config/contracts";
import { interestRateToAPY, calcUtilization } from "@/lib/format";

export interface MorphoMarketData {
  id: string;
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  loanSymbol: string;
  collateralSymbol: string;
  loanDecimals: number;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
  lltvPercent: number;
  totalSupplyAssets: bigint;
  totalBorrowAssets: bigint;
  utilization: number;
  fee: bigint;
  lastUpdate: bigint;
  protocol: "morpho";
}

// Known Morpho Blue market IDs on Avalanche
// Since Morpho Blue on Avalanche is new, there may be few or no markets yet
// We'll discover them from createMarket events
export const KNOWN_MORPHO_MARKET_IDS: string[] = [];

export function useMorphoMarkets(marketIds: string[]) {
  const morphoAddress = MORPHO_ADDRESSES.MORPHO_BLUE;

  // For each market ID, read market data and params
  const contracts = marketIds.flatMap((id) => [
    {
      address: morphoAddress,
      abi: morphoBlueAbi,
      functionName: "market",
      args: [id as `0x${string}`],
    } as const,
    {
      address: morphoAddress,
      abi: morphoBlueAbi,
      functionName: "idToMarketParams",
      args: [id as `0x${string}`],
    } as const,
  ]);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts,
    query: {
      enabled: marketIds.length > 0,
      staleTime: 30_000,
    },
  });

  const markets: MorphoMarketData[] = [];

  if (data) {
    const FIELDS_PER_MARKET = 2;

    for (let i = 0; i < marketIds.length; i++) {
      const offset = i * FIELDS_PER_MARKET;
      const marketResult = data[offset];
      const paramsResult = data[offset + 1];

      if (
        marketResult?.status !== "success" ||
        paramsResult?.status !== "success"
      ) {
        continue;
      }

      const [
        totalSupplyAssets,
        ,
        totalBorrowAssets,
        ,
        lastUpdate,
        fee,
      ] = marketResult.result as [bigint, bigint, bigint, bigint, bigint, bigint];

      const [loanToken, collateralToken, oracle, irm, lltv] =
        paramsResult.result as [
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          `0x${string}`,
          bigint,
        ];

      const loanMeta = getTokenByAddress(loanToken);
      const collateralMeta = getTokenByAddress(collateralToken);

      const utilization = calcUtilization(
        totalBorrowAssets,
        totalSupplyAssets
      );

      markets.push({
        id: marketIds[i],
        loanToken,
        collateralToken,
        loanSymbol: loanMeta?.symbol ?? "???",
        collateralSymbol: collateralMeta?.symbol ?? "???",
        loanDecimals: loanMeta?.decimals ?? 18,
        oracle,
        irm,
        lltv,
        lltvPercent: Number(lltv) / 1e16,
        totalSupplyAssets,
        totalBorrowAssets,
        utilization,
        fee,
        lastUpdate,
        protocol: "morpho",
      });
    }
  }

  return { markets, isLoading, error, refetch };
}
