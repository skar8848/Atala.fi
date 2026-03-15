"use client";

import { useMemo } from "react";
import { useAccount, useReadContracts } from "wagmi";
import { erc20Abi } from "viem";
import { TOKENS, type TokenMeta } from "@/config/contracts";
import type { TokenWithBalance } from "@/lib/canvas/types";

const ALL_TOKENS: TokenMeta[] = Object.values(TOKENS);

export function useTokenBalances(
  tokens: TokenMeta[] = ALL_TOKENS
): { assetsWithBalances: TokenWithBalance[]; isLoading: boolean } {
  const { address, isConnected } = useAccount();

  const contracts = useMemo(() => {
    if (!address || !isConnected) return [];
    return tokens.map((token) => ({
      address: token.address as `0x${string}`,
      abi: erc20Abi,
      functionName: "balanceOf" as const,
      args: [address] as const,
    }));
  }, [tokens, address, isConnected]);

  const { data, isLoading } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : undefined,
    query: {
      enabled: isConnected && contracts.length > 0,
      refetchInterval: 30_000,
      retry: 3,
      retryDelay: (attempt: number) => Math.min(1000 * 2 ** attempt, 5000),
    },
  });

  const assetsWithBalances: TokenWithBalance[] = useMemo(() => {
    return tokens.map((token, i) => {
      const result = data?.[i];
      const rawBalance =
        result?.status === "success" ? (result.result as bigint) : 0n;

      let formatted = "0";
      if (rawBalance > 0n) {
        const divisor = 10n ** BigInt(token.decimals);
        const intPart = rawBalance / divisor;
        const fracPart = rawBalance % divisor;
        const fracStr = fracPart
          .toString()
          .padStart(token.decimals, "0")
          .slice(0, 6);
        formatted =
          `${intPart}.${fracStr}`.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") || "0";
      }

      return {
        ...token,
        balance: formatted,
        balanceRaw: rawBalance,
      };
    });
  }, [tokens, data]);

  return { assetsWithBalances, isLoading };
}
