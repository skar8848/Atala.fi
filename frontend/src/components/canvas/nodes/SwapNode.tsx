"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Handle, Position, useReactFlow, useEdges, useNodes, type NodeProps } from "@xyflow/react";
import { erc20Abi, isAddress } from "viem";
import { readContracts } from "wagmi/actions";
import { TOKENS, type TokenMeta } from "@/config/contracts";
import { config as wagmiConfig } from "@/config/wagmi";
import { useTokenBalances } from "@/hooks/useTokenBalances";
import { useCowQuote } from "@/hooks/useCowQuote";
import type { SwapNodeData, TokenInfo } from "@/lib/canvas/types";
import NodeShell from "./NodeShell";
import SearchSelect from "./SearchSelect";

const AVALANCHE_CHAIN_ID = 43114;

const SWAP_TOKENS: TokenMeta[] = [
  TOKENS.WAVAX, TOKENS.USDC, TOKENS.USDT, TOKENS.WETH, TOKENS.BTCb,
  TOKENS.WBTC, TOKENS.SAVAX, TOKENS.GGAVAX, TOKENS.AUSD, TOKENS.AVUSD,
  TOKENS.SAVUSD, TOKENS.DEUSD, TOKENS.SDEUSD, TOKENS.SUSDE, TOKENS.EURC,
  TOKENS.USDE,
].filter(Boolean);

/** Fetch ERC-20 info on-chain for a pasted address */
async function fetchTokenInfo(address: `0x${string}`): Promise<TokenInfo | null> {
  try {
    const results = await readContracts(wagmiConfig, {
      contracts: [
        { address, abi: erc20Abi, functionName: "name", chainId: AVALANCHE_CHAIN_ID },
        { address, abi: erc20Abi, functionName: "symbol", chainId: AVALANCHE_CHAIN_ID },
        { address, abi: erc20Abi, functionName: "decimals", chainId: AVALANCHE_CHAIN_ID },
      ],
    });
    const name = results[0]?.status === "success" ? (results[0].result as string) : null;
    const symbol = results[1]?.status === "success" ? (results[1].result as string) : null;
    const decimals = results[2]?.status === "success" ? (results[2].result as number) : null;
    if (!symbol || decimals === null) return null;
    return { name: name ?? symbol, symbol, decimals, address };
  } catch {
    return null;
  }
}

function SwapNodeComponent({ id, data }: NodeProps) {
  const { updateNodeData, deleteElements } = useReactFlow();
  const d = data as unknown as SwapNodeData;
  const edges = useEdges();
  const allNodes = useNodes();
  const [importLoading, setImportLoading] = useState(false);
  const [customTokens, setCustomTokens] = useState<TokenInfo[]>([]);

  // Detect upstream asset + amount
  const { upstreamAsset, upstreamAmount } = useMemo(() => {
    const incomingEdge = edges.find((e) => e.target === id);
    if (!incomingEdge) return { upstreamAsset: null, upstreamAmount: 0 };
    const sourceNode = allNodes.find((n) => n.id === incomingEdge.source);
    if (!sourceNode) return { upstreamAsset: null, upstreamAmount: 0 };
    const sd = sourceNode.data as Record<string, unknown>;

    if (sd.type === "eulerBorrow" || sd.type === "siloBorrow") {
      const vault = sd.vault as { asset?: TokenInfo } | null;
      const pair = sd.pair as { token0?: TokenInfo; token1?: TokenInfo } | null;
      const side = sd.side as 0 | 1 | undefined;
      const amt = (sd.borrowAmount as number) ?? 0;
      let token: TokenInfo | null = null;
      if (sd.type === "eulerBorrow") token = vault?.asset ?? null;
      else if (pair) token = (side ?? 0) === 0 ? pair.token0 ?? null : pair.token1 ?? null;
      return { upstreamAsset: token, upstreamAmount: amt };
    }
    if (sd.type === "eulerWithdraw" || sd.type === "siloWithdraw" || sd.type === "atalaWithdraw") {
      const pos = sd.position as Record<string, unknown> | null;
      const amt = parseFloat((sd.amount as string) || "0");
      if (sd.type === "eulerWithdraw" || sd.type === "atalaWithdraw") {
        const vault = (pos as { vault?: { asset?: TokenInfo } } | null)?.vault;
        return { upstreamAsset: vault?.asset ?? null, upstreamAmount: amt };
      }
      // siloWithdraw
      const siloPos = pos as { pair?: { token0?: TokenInfo; token1?: TokenInfo }; side?: 0 | 1 } | null;
      const s = siloPos?.side ?? 0;
      const token = s === 0 ? siloPos?.pair?.token0 ?? null : siloPos?.pair?.token1 ?? null;
      return { upstreamAsset: token, upstreamAmount: amt };
    }
    return { upstreamAsset: null, upstreamAmount: 0 };
  }, [edges, allNodes, id]);

  // Auto-set tokenIn when upstream connects
  const prevUpstreamRef = useRef<string | null>(null);
  useEffect(() => {
    if (!upstreamAsset) { prevUpstreamRef.current = null; return; }
    const addr = upstreamAsset.address.toLowerCase();
    if (addr !== prevUpstreamRef.current) {
      prevUpstreamRef.current = addr;
      updateNodeData(id, { tokenIn: upstreamAsset });
    }
  }, [upstreamAsset]);

  // Auto-fill amount from upstream
  useEffect(() => {
    if (upstreamAmount > 0 && d.amountIn !== String(upstreamAmount)) {
      updateNodeData(id, { amountIn: upstreamAmount.toFixed(6) });
    }
  }, [upstreamAmount]);

  // Wallet balances for both tokens
  const balanceAssets = useMemo(() => {
    const list: TokenMeta[] = [];
    if (d.tokenIn) list.push(d.tokenIn as TokenMeta);
    if (d.tokenOut && d.tokenOut.address !== d.tokenIn?.address) list.push(d.tokenOut as TokenMeta);
    return list;
  }, [d.tokenIn, d.tokenOut]);
  const { assetsWithBalances } = useTokenBalances(balanceAssets);

  const walletBalanceIn = useMemo(() => {
    if (!d.tokenIn) return 0;
    const found = assetsWithBalances.find((a) => a.address.toLowerCase() === d.tokenIn!.address.toLowerCase());
    return parseFloat(found?.balance ?? "0");
  }, [assetsWithBalances, d.tokenIn]);

  const tokenInMatchesUpstream = upstreamAsset && d.tokenIn
    ? d.tokenIn.address.toLowerCase() === upstreamAsset.address.toLowerCase()
    : false;
  const availableIn = tokenInMatchesUpstream ? upstreamAmount : walletBalanceIn;
  const currentAmountIn = parseFloat(d.amountIn || "0");
  const exceedsBalance = availableIn > 0 && currentAmountIn > availableIn;

  // Persist blocked state
  const prevExceedsRef = useRef(false);
  useEffect(() => {
    if (exceedsBalance !== prevExceedsRef.current) {
      prevExceedsRef.current = exceedsBalance;
      updateNodeData(id, { exceedsBalance });
    }
  }, [exceedsBalance]);

  // Merged tokens
  const allTokens = useMemo(() => {
    const merged = new Map<string, TokenInfo>();
    for (const a of SWAP_TOKENS) merged.set(a.address.toLowerCase(), a);
    for (const a of customTokens) merged.set(a.address.toLowerCase(), a);
    return Array.from(merged.values());
  }, [customTokens]);

  const assetOptions = useMemo(
    () => allTokens.map((a) => ({ value: a.address, label: a.symbol })),
    [allTokens]
  );

  const handleImportAddress = useCallback(async (address: string) => {
    if (!isAddress(address)) return;
    setImportLoading(true);
    try {
      const token = await fetchTokenInfo(address as `0x${string}`);
      if (token) {
        setCustomTokens((prev) => {
          if (prev.some((t) => t.address.toLowerCase() === address.toLowerCase())) return prev;
          return [...prev, token];
        });
      }
    } finally {
      setImportLoading(false);
    }
  }, []);

  // Quote via useCowQuote (ParaSwap fallback for Avalanche)
  const { quote, loading: quoteLoading, provider } = useCowQuote({
    tokenIn: d.tokenIn?.address,
    tokenOut: d.tokenOut?.address,
    amountIn: d.amountIn,
    decimalsIn: d.tokenIn?.decimals ?? 18,
    decimalsOut: d.tokenOut?.decimals ?? 18,
    chainId: AVALANCHE_CHAIN_ID,
    enabled: !!d.tokenIn && !!d.tokenOut && currentAmountIn > 0,
  });

  // Persist quote
  const prevQuoteRef = useRef<string | null>(null);
  useEffect(() => {
    if (quote && quote !== prevQuoteRef.current) {
      prevQuoteRef.current = quote;
      updateNodeData(id, { quoteOut: quote });
    } else if (!quote && prevQuoteRef.current) {
      prevQuoteRef.current = null;
      updateNodeData(id, { quoteOut: "" });
    }
  }, [quote]);

  const providerLabel = provider === "cowswap" ? "CowSwap" : provider === "paraswap" ? "ParaSwap" : "DEX";

  return (
    <NodeShell
      nodeType="swap"
      title={`Swap (${providerLabel})`}
      onDelete={() => deleteElements({ nodes: [{ id }] })}
      invalid={exceedsBalance}
      loading={quoteLoading}
    >
      <div className="space-y-2">
        {/* Token In */}
        <div>
          <div className="flex items-center justify-between">
            <label className="text-[10px]" style={{ color: "#586878" }}>From</label>
            {d.tokenIn && availableIn > 0 && (
              <span className="text-[9px]" style={{ color: "#586878" }}>
                {tokenInMatchesUpstream ? "Upstream" : "Wallet"}: {availableIn.toFixed(4)}
              </span>
            )}
          </div>
          <SearchSelect
            options={assetOptions}
            value={d.tokenIn?.address ?? ""}
            onChange={(addr) => {
              const token = allTokens.find((a) => a.address === addr) ?? null;
              updateNodeData(id, { tokenIn: token });
            }}
            onImportAddress={handleImportAddress}
            importLoading={importLoading}
            placeholder="Search or paste address..."
          />
        </div>

        {/* Amount In */}
        <div className="nodrag space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px]" style={{ color: "#586878" }}>Amount</label>
            {availableIn > 0 && (
              <button
                type="button"
                onClick={() => updateNodeData(id, { amountIn: availableIn.toFixed(6) })}
                className="text-[9px] transition-colors hover:opacity-80"
                style={{ color: "#586878" }}
              >
                MAX
              </button>
            )}
          </div>
          <input
            type="number"
            placeholder="0.00"
            className="w-full rounded-lg border px-2 py-1.5 text-xs outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            style={{
              backgroundColor: "#0a121c",
              borderColor: exceedsBalance ? "#eb365a" : "rgba(255,255,255,0.08)",
              color: "#e2e8f0",
            }}
            value={d.amountIn}
            onChange={(e) => updateNodeData(id, { amountIn: e.target.value })}
          />
          {exceedsBalance && (
            <p className="text-[10px]" style={{ color: "#eb365a" }}>
              Exceeds balance ({availableIn.toFixed(4)} {d.tokenIn?.symbol ?? ""})
            </p>
          )}
          {availableIn > 0 && (
            <>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.min(100, Math.round((currentAmountIn / availableIn) * 100))}
                onChange={(e) => {
                  const p = parseInt(e.target.value);
                  updateNodeData(id, { amountIn: ((availableIn * p) / 100).toFixed(6) });
                }}
                className="w-full"
                style={{ accentColor: "#eab308" }}
              />
              <div className="flex items-center justify-between rounded-lg px-2 py-1" style={{ backgroundColor: "#0a121c" }}>
                <span className="text-[10px]" style={{ color: "#586878" }}>
                  {currentAmountIn.toFixed(4)} {d.tokenIn?.symbol ?? ""}
                </span>
                <span className="text-[10px]" style={{ color: "#586878" }}>
                  of {availableIn.toFixed(4)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Arrow */}
        <div className="flex justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3v10M8 13l3-3M8 13l-3-3" stroke="#586878" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Token Out */}
        <div>
          <label className="text-[10px]" style={{ color: "#586878" }}>To</label>
          <SearchSelect
            options={assetOptions}
            value={d.tokenOut?.address ?? ""}
            onChange={(addr) => {
              const token = allTokens.find((a) => a.address === addr) ?? null;
              updateNodeData(id, { tokenOut: token });
            }}
            onImportAddress={handleImportAddress}
            importLoading={importLoading}
            placeholder="Search or paste address..."
          />
        </div>

        {/* Quote display */}
        {d.tokenIn && d.tokenOut && currentAmountIn > 0 && (
          <div className="rounded-lg px-2 py-1.5" style={{ backgroundColor: "#0a121c" }}>
            <span className="text-[10px]" style={{ color: "#586878" }}>Estimated output</span>
            {quoteLoading ? (
              <div className="mt-0.5 h-4 animate-pulse rounded" style={{ backgroundColor: "rgba(255,255,255,0.05)" }} />
            ) : quote ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium" style={{ color: "#e2e8f0" }}>
                  {quote} {d.tokenOut.symbol}
                </span>
              </div>
            ) : (
              <p className="text-[10px]" style={{ color: "#586878" }}>No quote available</p>
            )}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#eab308", backgroundColor: "#0c1218" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !rounded-full !border-2"
        style={{ borderColor: "#eab308", backgroundColor: "#0c1218" }}
      />
    </NodeShell>
  );
}

export default memo(SwapNodeComponent);
