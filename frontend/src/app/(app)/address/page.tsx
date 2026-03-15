"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isAddress, formatUnits } from "viem";
import { useAddressPositions } from "@/hooks/useAddressPositions";
import {
  buildStrategyFromPositions,
  saveImportedStrategy,
} from "@/lib/canvas/importStrategy";

function parseAddress(input: string): string | null {
  const trimmed = input.trim();
  const addrMatch = trimmed.match(/^(0x[a-fA-F0-9]{40})$/);
  if (addrMatch && isAddress(addrMatch[1])) return addrMatch[1].toLowerCase();
  // Snowtrace URL
  const urlMatch = trimmed.match(
    /^https:\/\/(?:www\.)?snowtrace\.io\/address\/(0x[a-fA-F0-9]{40})/i
  );
  if (urlMatch && isAddress(urlMatch[1])) return urlMatch[1].toLowerCase();
  return null;
}

export default function AddressPage() {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [address, setAddress] = useState<string | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);

  const { eulerPositions, siloPositions, loading, error } =
    useAddressPositions(address);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = parseAddress(inputValue);
      if (!parsed) {
        setInputError("Invalid address or Snowtrace URL");
        return;
      }
      setInputError(null);
      setAddress(parsed);
    },
    [inputValue]
  );

  const handleSeeInCanvas = useCallback(() => {
    if (!address) return;
    const strategy = buildStrategyFromPositions(
      address,
      eulerPositions,
      siloPositions,
      [] // atala positions (TODO)
    );
    saveImportedStrategy(strategy);
    router.push("/visualize");
  }, [address, eulerPositions, siloPositions, router]);

  const hasPositions = eulerPositions.length > 0 || siloPositions.length > 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">
          Address Explorer
        </h1>
        <p className="mt-1 text-sm text-[#586878]">
          View Euler V2 &amp; Silo V2 positions for any address on Avalanche
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Paste address (0x...) or Snowtrace URL"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(null);
              }}
              className={`w-full rounded-xl border bg-[#0c1218] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-[#586878] focus:border-[#55c3e9] ${
                inputError ? "border-[#eb365a]" : "border-white/8"
              }`}
            />
            {inputError && (
              <p className="absolute -bottom-5 left-1 text-[11px] text-[#eb365a]">
                {inputError}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="rounded-xl bg-[#55c3e9] px-6 py-3 text-sm font-medium text-[#0a121c] transition-colors hover:bg-[#55c3e9]/90"
          >
            Explore
          </button>
        </div>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#55c3e9] border-t-transparent" />
          <span className="text-sm text-[#586878]">
            Loading positions...
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-[#eb365a]/20 bg-[#eb365a]/5 px-4 py-3 text-sm text-[#eb365a]">
          {error}
        </div>
      )}

      {/* Results */}
      {address && !loading && !error && (
        <div className="space-y-6">
          {/* Address header + import button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#55c3e9]/10">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3.5" stroke="#55c3e9" strokeWidth="1.5" />
                  <path d="M3 17.5c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="#55c3e9" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <span className="font-mono text-sm text-white">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <div className="flex items-center gap-3 text-[11px] text-[#586878]">
                  <span>{eulerPositions.length} Euler positions</span>
                  <span>{siloPositions.length} Silo positions</span>
                </div>
              </div>
            </div>

            {hasPositions && (
              <button
                onClick={handleSeeInCanvas}
                className="flex items-center gap-2 rounded-xl border border-[#55c3e9]/30 bg-[#55c3e9]/10 px-4 py-2.5 text-sm font-medium text-[#55c3e9] transition-colors hover:bg-[#55c3e9]/20"
              >
                See in Canvas
              </button>
            )}
          </div>

          {/* Euler Positions */}
          {eulerPositions.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-[#8898a8]">
                Euler V2 Positions
              </h2>
              <div className="space-y-2">
                {eulerPositions.map((pos, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0c1218] px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">
                        {pos.vault.name}
                      </p>
                      <p className="text-xs text-[#586878]">
                        {pos.vault.asset.symbol}
                      </p>
                    </div>
                    <div className="text-right">
                      {pos.supplyAssets > 0n && (
                        <p className="text-sm text-[#02c77b]">
                          Supply: {formatUnits(pos.supplyAssets, pos.vault.asset.decimals).slice(0, 12)}
                        </p>
                      )}
                      {pos.borrowAssets > 0n && (
                        <p className="text-sm text-[#eb365a]">
                          Debt: {formatUnits(pos.borrowAssets, pos.vault.asset.decimals).slice(0, 12)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Silo Positions */}
          {siloPositions.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-[#8898a8]">
                Silo V2 Positions
              </h2>
              <div className="space-y-2">
                {siloPositions.map((pos, i) => {
                  const token = pos.side === 0 ? pos.pair.token0 : pos.pair.token1;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-white/8 bg-[#0c1218] px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {pos.pair.token0.symbol} / {pos.pair.token1.symbol}
                        </p>
                        <p className="text-xs text-[#586878]">
                          Side: {token.symbol}
                        </p>
                      </div>
                      <div className="text-right">
                        {pos.depositAssets > 0n && (
                          <p className="text-sm text-[#02c77b]">
                            Deposit: {formatUnits(pos.depositAssets, token.decimals).slice(0, 12)}
                          </p>
                        )}
                        {pos.borrowAssets > 0n && (
                          <p className="text-sm text-[#eb365a]">
                            Debt: {formatUnits(pos.borrowAssets, token.decimals).slice(0, 12)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!hasPositions && (
            <div className="rounded-xl border border-white/8 bg-[#0c1218] py-16 text-center">
              <p className="text-sm text-[#586878]">
                No positions found for this address on Avalanche
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
