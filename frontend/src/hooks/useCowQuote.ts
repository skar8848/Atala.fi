"use client";

import { useState, useEffect, useRef } from "react";

// CowSwap does NOT support Avalanche (chain 43114).
// Supported chains: Ethereum (1), Gnosis (100), Arbitrum (42161), Base (8453), Sepolia (11155111).
// For Avalanche we fall back to ParaSwap.
const COW_API_BASE: Record<number, string> = {
  1: "https://api.cow.fi/mainnet/api/v1",
  8453: "https://api.cow.fi/base/api/v1",
  42161: "https://api.cow.fi/arbitrum_one/api/v1",
  100: "https://api.cow.fi/xdai/api/v1",
};

// ParaSwap supports Avalanche
const PARASWAP_API_BASE = "https://apiv5.paraswap.io";
const PARASWAP_SUPPORTED_CHAINS = [1, 56, 137, 43114, 42161, 10, 8453, 250, 100];

interface UseCowQuoteParams {
  tokenIn: string | undefined;
  tokenOut: string | undefined;
  amountIn: string;
  decimalsIn: number;
  decimalsOut: number;
  chainId: number;
  enabled: boolean;
}

interface UseCowQuoteResult {
  quote: string | null;
  loading: boolean;
  error: string | null;
  provider: "cowswap" | "paraswap" | null;
}

/**
 * Convert a human-readable amount string to raw wei string.
 * Uses string math to avoid float precision loss.
 */
function toRawAmount(amount: string, decimals: number): string {
  const parts = amount.split(".");
  const intPart = parts[0] || "0";
  const fracPart = (parts[1] || "").slice(0, decimals).padEnd(decimals, "0");
  const raw = BigInt(intPart + fracPart);
  return raw.toString();
}

/**
 * Convert a raw bigint string to human-readable with up to 6 decimal places.
 */
function fromRawAmount(raw: string, decimals: number): string | null {
  try {
    const bn = BigInt(raw);
    const divisor = 10n ** BigInt(decimals);
    const intPart = bn / divisor;
    const fracPart = bn % divisor;
    const fracStr = fracPart
      .toString()
      .padStart(decimals, "0")
      .slice(0, 6);
    return (
      `${intPart}.${fracStr}`
        .replace(/(\.\d*?)0+$/, "$1")
        .replace(/\.$/, "") || "0"
    );
  } catch {
    return null;
  }
}

/**
 * Fetch a quote from CowSwap order book API.
 */
async function fetchCowQuote(
  apiBase: string,
  tokenIn: string,
  tokenOut: string,
  sellAmountWei: string,
  decimalsOut: number,
  signal: AbortSignal
): Promise<string | null> {
  const res = await fetch(`${apiBase}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      sellToken: tokenIn,
      buyToken: tokenOut,
      sellAmountBeforeFee: sellAmountWei,
      kind: "sell",
      from: "0x0000000000000000000000000000000000000000",
      priceQuality: "fast",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.description ?? `CowSwap error ${res.status}`);
  }

  const data = await res.json();
  const buyAmount = data.quote?.buyAmount;
  if (!buyAmount) return null;
  return fromRawAmount(buyAmount, decimalsOut);
}

/**
 * Fetch a quote from ParaSwap prices API (used for Avalanche).
 */
async function fetchParaSwapQuote(
  chainId: number,
  tokenIn: string,
  tokenOut: string,
  sellAmountWei: string,
  decimalsIn: number,
  decimalsOut: number,
  signal: AbortSignal
): Promise<string | null> {
  const url = new URL(`${PARASWAP_API_BASE}/prices`);
  url.searchParams.set("srcToken", tokenIn);
  url.searchParams.set("destToken", tokenOut);
  url.searchParams.set("amount", sellAmountWei);
  url.searchParams.set("srcDecimals", decimalsIn.toString());
  url.searchParams.set("destDecimals", decimalsOut.toString());
  url.searchParams.set("side", "SELL");
  url.searchParams.set("network", chainId.toString());

  const res = await fetch(url.toString(), { signal });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error ?? `ParaSwap error ${res.status}`);
  }

  const data = await res.json();
  const destAmount = data.priceRoute?.destAmount;
  if (!destAmount) return null;
  return fromRawAmount(destAmount, decimalsOut);
}

/**
 * Debounced swap quote hook.
 * Tries CowSwap first. If the chain is not supported by CowSwap (e.g. Avalanche 43114),
 * falls back to ParaSwap.
 */
export function useCowQuote({
  tokenIn,
  tokenOut,
  amountIn,
  decimalsIn,
  decimalsOut,
  chainId,
  enabled,
}: UseCowQuoteParams): UseCowQuoteResult {
  const [quote, setQuote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<"cowswap" | "paraswap" | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Clear previous
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();

    const cowApiBase = COW_API_BASE[chainId];
    const paraSwapSupported = PARASWAP_SUPPORTED_CHAINS.includes(chainId);

    if (
      !enabled ||
      (!cowApiBase && !paraSwapSupported) ||
      !tokenIn ||
      !tokenOut ||
      !amountIn ||
      parseFloat(amountIn) <= 0
    ) {
      setQuote(null);
      setLoading(false);
      setError(null);
      setProvider(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Debounce 500ms
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const sellAmountWei = toRawAmount(amountIn, decimalsIn);
        let result: string | null = null;

        // Try CowSwap first if supported on this chain
        if (cowApiBase) {
          try {
            result = await fetchCowQuote(
              cowApiBase,
              tokenIn,
              tokenOut,
              sellAmountWei,
              decimalsOut,
              controller.signal
            );
            if (result) {
              setProvider("cowswap");
            }
          } catch (cowErr) {
            if (controller.signal.aborted) return;
            // CowSwap failed; try ParaSwap as fallback if available
            if (paraSwapSupported) {
              result = await fetchParaSwapQuote(
                chainId,
                tokenIn,
                tokenOut,
                sellAmountWei,
                decimalsIn,
                decimalsOut,
                controller.signal
              );
              if (result) {
                setProvider("paraswap");
              }
            } else {
              throw cowErr;
            }
          }
        } else if (paraSwapSupported) {
          // CowSwap not available; go straight to ParaSwap (Avalanche path)
          result = await fetchParaSwapQuote(
            chainId,
            tokenIn,
            tokenOut,
            sellAmountWei,
            decimalsIn,
            decimalsOut,
            controller.signal
          );
          if (result) {
            setProvider("paraswap");
          }
        }

        if (controller.signal.aborted) return;
        setQuote(result);
        setLoading(false);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Quote failed");
        setQuote(null);
        setProvider(null);
        setLoading(false);
      }
    }, 500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      abortRef.current?.abort();
    };
  }, [tokenIn, tokenOut, amountIn, decimalsIn, decimalsOut, chainId, enabled]);

  return { quote, loading, error, provider };
}
