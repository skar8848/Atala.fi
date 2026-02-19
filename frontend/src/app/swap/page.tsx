"use client";

import dynamic from "next/dynamic";
import { useChainId } from "wagmi";
import { avalanche } from "wagmi/chains";
import { Badge } from "@/components/ui/badge";

const SwapWidget = dynamic(() => import("@/components/swap/SwapWidget"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-32">
      <p className="text-sm text-muted-foreground">Loading swap...</p>
    </div>
  ),
});

export default function SwapPage() {
  const chainId = useChainId();
  const isMainnet = chainId === avalanche.id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Swap</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gasless token swaps on Avalanche powered by CoW Protocol
        </p>
      </div>

      {!isMainnet && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          <svg className="w-4 h-4 text-amber-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zM8 11a1 1 0 100 2 1 1 0 000-2z" />
          </svg>
          <p className="text-sm text-amber-200">
            CoW Swap is only available on <Badge variant="secondary" className="text-[10px] mx-1">Avalanche Mainnet</Badge> — connect your wallet inside the widget to swap.
          </p>
        </div>
      )}

      <div className="flex justify-center">
        <SwapWidget />
      </div>
    </div>
  );
}
