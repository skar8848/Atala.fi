"use client";

import { useMemo, useState, useCallback, useRef } from "react";
import type { Edge } from "@xyflow/react";
import { useNodes, useEdges } from "@xyflow/react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { erc20Abi, parseUnits, encodeFunctionData } from "viem";
import { validateGraph } from "@/lib/canvas/validation";
import {
  buildExecutionBundle,
  encodeEvcBatch,
  encodeApproval,
  topologicalSort,
  type ExecutionBundle,
} from "@/lib/canvas/executor";
import type { CanvasNode, CanvasNodeData } from "@/lib/canvas/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVALANCHE_CHAIN_ID = 43114;
const SNOWTRACE_BASE = "https://snowtrace.io";

/** Step type color classes (Pacifica theme) */
const typeColors: Record<string, string> = {
  approve: "text-yellow-400 border-yellow-400/20 bg-yellow-400/5",
  withdraw: "text-orange-400 border-orange-400/20 bg-orange-400/5",
  deposit: "text-[#55c3e9] border-[#55c3e9]/20 bg-[#55c3e9]/5",
  borrow: "text-[#02c77b] border-[#02c77b]/20 bg-[#02c77b]/5",
  swap: "text-amber-400 border-amber-400/20 bg-amber-400/5",
  repay: "text-[#eb365a] border-[#eb365a]/20 bg-[#eb365a]/5",
  batch: "text-[#55c3e9] border-[#55c3e9]/20 bg-[#55c3e9]/5",
};

const typeLabels: Record<string, string> = {
  approve: "APPROVE",
  withdraw: "WITHDRAW",
  deposit: "DEPOSIT",
  borrow: "BORROW",
  swap: "SWAP",
  repay: "REPAY",
  batch: "BATCH",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function safeFloat(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isFinite(n) ? n : 0;
}

function fmtNum(val: number, decimals = 4): string {
  return val.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  });
}

function fmtApy(apy: number | undefined): string {
  if (!apy || !isFinite(apy)) return "";
  return ` (${(apy * 100).toFixed(2)}% APY)`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExecutionPhase =
  | "idle"
  | "validating"
  | "confirming"
  | "approving"
  | "executing-euler"
  | "executing-silo"
  | "executing-atala"
  | "swapping"
  | "success"
  | "error";

interface BundleStep {
  label: string;
  detail: string;
  type: "approve" | "withdraw" | "deposit" | "borrow" | "swap" | "repay" | "batch";
}

interface StepStatus {
  label: string;
  detail: string;
  stepType: string;
  status: "pending" | "active" | "done" | "error";
  txHash?: string;
}

// ---------------------------------------------------------------------------
// ExecuteButton -- rendered INSIDE <ReactFlow> for zustand context
// ---------------------------------------------------------------------------

export default function ExecuteButton() {
  // useNodes/useEdges work because this component is inside <ReactFlow>
  const nodes = useNodes() as CanvasNode[];
  const edges = useEdges();

  const { address, chainId: walletChainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [phase, setPhase] = useState<ExecutionPhase>("idle");
  const [liveSteps, setLiveSteps] = useState<StepStatus[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const isExecuting = !["idle", "success", "error"].includes(phase);
  const wrongChain = !!address && walletChainId !== AVALANCHE_CHAIN_ID;
  const isConnected = !!address && !!walletClient;

  // Ref to track address changes during async execution
  const addressRef = useRef(address);
  addressRef.current = address;
  const isExecutingRef = useRef(false);

  // ---------- Build visual steps from graph ----------

  const steps = useMemo(() => {
    const s: BundleStep[] = [];
    let sorted: CanvasNode[];
    try {
      sorted = topologicalSort(nodes, edges);
    } catch {
      return s;
    }

    for (const node of sorted) {
      const d = node.data as CanvasNodeData;

      switch (d.type) {
        // ---- Euler V2 ----
        case "eulerDeposit": {
          if (!d.vault || safeFloat(d.amount) <= 0) break;
          s.push({
            label: `Approve ${d.vault.asset.symbol}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${d.vault.asset.symbol} to Euler vault`,
            type: "approve",
          });
          s.push({
            label: `Deposit into ${d.vault.name || "Euler Vault"}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${d.vault.asset.symbol}${fmtApy(d.vault.supplyAPY)}`,
            type: "deposit",
          });
          break;
        }
        case "eulerBorrow": {
          if (!d.vault || !isFinite(d.borrowAmount) || d.borrowAmount <= 0) break;
          s.push({
            label: `Borrow ${d.vault.asset.symbol} (Euler)`,
            detail: `${fmtNum(d.borrowAmount, 6)} ${d.vault.asset.symbol}${fmtApy(d.vault.borrowAPY)}`,
            type: "borrow",
          });
          break;
        }
        case "eulerWithdraw": {
          if (!d.position?.vault || safeFloat(d.amount) <= 0) break;
          s.push({
            label: `Withdraw from ${d.position.vault.name || "Euler Vault"}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${d.position.vault.asset.symbol}`,
            type: "withdraw",
          });
          break;
        }
        case "eulerRepay": {
          if (!d.vault || safeFloat(d.amount) <= 0) break;
          s.push({
            label: `Approve ${d.vault.asset.symbol}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${d.vault.asset.symbol} to Euler vault`,
            type: "approve",
          });
          s.push({
            label: `Repay ${d.vault.asset.symbol} (Euler)`,
            detail: `${fmtNum(safeFloat(d.amount))} ${d.vault.asset.symbol}`,
            type: "repay",
          });
          break;
        }

        // ---- Silo V2 ----
        case "siloDeposit": {
          if (!d.pair || safeFloat(d.amount) <= 0) break;
          const token = d.side === 0 ? d.pair.token0 : d.pair.token1;
          s.push({
            label: `Approve ${token.symbol}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${token.symbol} to Silo`,
            type: "approve",
          });
          s.push({
            label: `Deposit ${token.symbol} into Silo`,
            detail: `${fmtNum(safeFloat(d.amount))} ${token.symbol}${fmtApy(d.side === 0 ? d.pair.supplyAPY0 : d.pair.supplyAPY1)}`,
            type: "deposit",
          });
          break;
        }
        case "siloBorrow": {
          if (!d.pair || !isFinite(d.borrowAmount) || d.borrowAmount <= 0) break;
          const token = d.side === 0 ? d.pair.token0 : d.pair.token1;
          s.push({
            label: `Borrow ${token.symbol} (Silo)`,
            detail: `${fmtNum(d.borrowAmount, 6)} ${token.symbol}${fmtApy(d.side === 0 ? d.pair.borrowAPY0 : d.pair.borrowAPY1)}`,
            type: "borrow",
          });
          break;
        }
        case "siloWithdraw": {
          if (!d.position?.pair || safeFloat(d.amount) <= 0) break;
          const token = d.position.side === 0 ? d.position.pair.token0 : d.position.pair.token1;
          s.push({
            label: `Withdraw ${token.symbol} from Silo`,
            detail: `${fmtNum(safeFloat(d.amount))} ${token.symbol}`,
            type: "withdraw",
          });
          break;
        }
        case "siloRepay": {
          if (!d.pair || safeFloat(d.amount) <= 0) break;
          const token = d.side === 0 ? d.pair.token0 : d.pair.token1;
          s.push({
            label: `Approve ${token.symbol}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${token.symbol} to Silo`,
            type: "approve",
          });
          s.push({
            label: `Repay ${token.symbol} (Silo)`,
            detail: `${fmtNum(safeFloat(d.amount))} ${token.symbol}`,
            type: "repay",
          });
          break;
        }

        // ---- Swap ----
        case "swap": {
          if (!d.tokenIn || !d.tokenOut) break;
          s.push({
            label: `Swap ${d.tokenIn.symbol} -> ${d.tokenOut.symbol}`,
            detail: d.amountIn ? `${fmtNum(safeFloat(d.amountIn))} ${d.tokenIn.symbol}` : "Pending quote",
            type: "swap",
          });
          break;
        }

        // ---- Atala (ERC-4626) ----
        case "atalaDeposit": {
          if (!d.vault) break;
          if (!d.depositAll && safeFloat(d.amount) <= 0) break;
          s.push({
            label: `Approve ${d.vault.asset.symbol}`,
            detail: `${d.depositAll ? "All swap output" : fmtNum(safeFloat(d.amount))} ${d.vault.asset.symbol} to Atala Vault`,
            type: "approve",
          });
          s.push({
            label: `Deposit into ${d.vault.name || "Atala Vault"}`,
            detail: d.depositAll
              ? `All swap output -> ${d.vault.asset.symbol}`
              : `${fmtNum(safeFloat(d.amount))} ${d.vault.asset.symbol}`,
            type: "deposit",
          });
          break;
        }
        case "atalaWithdraw": {
          if (!d.position?.vault || safeFloat(d.amount) <= 0) break;
          s.push({
            label: `Withdraw from ${d.position.vault.name || "Atala Vault"}`,
            detail: `${fmtNum(safeFloat(d.amount))} ${d.position.vault.asset.symbol}`,
            type: "withdraw",
          });
          break;
        }
      }
    }

    // If there are Euler operations, note them as batched via EVC
    const eulerSteps = s.filter(
      (step) =>
        step.type !== "approve" &&
        step.type !== "swap" &&
        (step.label.includes("Euler") || step.label.includes("Euler Vault"))
    );
    if (eulerSteps.length > 1) {
      // Visual note only -- batch is handled by encodeEvcBatch
    }

    return s;
  }, [nodes, edges]);

  // ---------- Blocking error detection ----------

  const blockingError = useMemo(() => {
    for (const node of nodes) {
      const d = node.data as Record<string, unknown>;
      if (d.exceedsBalance) {
        const symbol =
          (d.asset as { symbol?: string })?.symbol ??
          (d.tokenIn as { symbol?: string })?.symbol ??
          "";
        return `Insufficient ${symbol} balance`;
      }
      if (d.exceedsLiquidity) {
        return "Insufficient market liquidity";
      }
    }
    return null;
  }, [nodes]);

  const actionCount = nodes.filter((n) => {
    const t = (n.data as { type: string }).type;
    return t !== "wallet" && t !== "position";
  }).length;

  // ---------- Helpers: send tx + wait ----------

  const waitWithRetry = useCallback(
    async (hash: `0x${string}`, retries = 3) => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const receipt = await publicClient!.waitForTransactionReceipt({
            hash,
            confirmations: 1,
            timeout: 60_000,
          });
          return receipt;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "";
          const isNetwork =
            msg.includes("Failed to fetch") || msg.includes("HTTP request failed");
          if (!isNetwork || attempt === retries - 1) throw err;
          await new Promise((r) => setTimeout(r, 3000));
        }
      }
      throw new Error("Receipt check failed after retries");
    },
    [publicClient]
  );

  // ---------- Check on-chain allowance ----------

  const checkAllowance = useCallback(
    async (token: `0x${string}`, owner: `0x${string}`, spender: `0x${string}`) => {
      if (!publicClient) return 0n;
      try {
        const allowance = await publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [owner, spender],
        });
        return allowance as bigint;
      } catch {
        return 0n;
      }
    },
    [publicClient]
  );

  // ---------- Execute handler ----------

  const handleExecute = useCallback(async () => {
    if (!address || !walletClient || !publicClient) return;
    setError(null);

    // 1. Validate
    const errors = validateGraph(nodes, edges);
    setValidationErrors(errors);
    if (errors.length > 0) {
      setShowConfirm(false);
      return;
    }

    // 2. If not yet in confirm mode, show confirmation
    if (!showConfirm) {
      // Build live step list for the confirmation UI
      const live: StepStatus[] = steps.map((s) => ({
        label: s.label,
        detail: s.detail,
        stepType: s.type,
        status: "pending",
      }));
      setLiveSteps(live);
      setShowConfirm(true);
      setExpanded(true);
      return;
    }

    // 3. Guard against double-execution
    if (isExecutingRef.current) return;
    isExecutingRef.current = true;
    setPhase("validating");
    setExpanded(true);

    // Snapshot current state
    const execNodes = JSON.parse(JSON.stringify(nodes)) as CanvasNode[];
    const execEdges = JSON.parse(JSON.stringify(edges)) as Edge[];
    const currentAddress = address;

    try {
      // Chain validation
      if (walletChainId !== AVALANCHE_CHAIN_ID) {
        throw new Error("Wrong network -- switch to Avalanche (43114) before executing");
      }

      const assertChain = () => {
        if (walletChainId !== AVALANCHE_CHAIN_ID) {
          throw new Error("Network changed during execution -- expected Avalanche");
        }
      };

      const assertAddress = () => {
        if (addressRef.current !== currentAddress) {
          throw new Error("Wallet address changed during execution. Aborting.");
        }
      };

      // Build bundle
      const bundle = buildExecutionBundle(execNodes, execEdges, currentAddress);
      let stepIdx = 0;

      const updateStep = (idx: number, status: StepStatus["status"], txHash?: string) => {
        setLiveSteps((prev) =>
          prev.map((s, i) => (i === idx ? { ...s, status, txHash } : s))
        );
      };

      // ---- Phase 1: Approvals ----
      setPhase("approving");
      for (const approval of bundle.approvals) {
        updateStep(stepIdx, "active");

        const existing = await checkAllowance(
          approval.token as `0x${string}`,
          currentAddress,
          approval.spender as `0x${string}`
        );

        if (existing < approval.amount) {
          assertChain();
          assertAddress();

          const { to, data } = encodeApproval(
            approval.token,
            approval.spender,
            approval.amount
          );

          const hash = await walletClient.sendTransaction({
            to: to as `0x${string}`,
            data,
            chain: walletClient.chain,
            account: currentAddress,
          });

          const receipt = await waitWithRetry(hash);
          if (receipt.status === "reverted") {
            throw new Error(`Approval for ${approval.symbol} reverted on-chain`);
          }
          updateStep(stepIdx, "done", hash);
        } else {
          updateStep(stepIdx, "done");
        }
        stepIdx++;
      }

      // ---- Phase 2: Euler V2 batch via EVC ----
      if (bundle.eulerBatchItems.length > 0) {
        setPhase("executing-euler");
        updateStep(stepIdx, "active");
        assertChain();
        assertAddress();

        const batchCall = encodeEvcBatch(bundle.eulerBatchItems);
        if (batchCall) {
          // Simulate first
          try {
            await publicClient.estimateGas({
              to: batchCall.to as `0x${string}`,
              data: batchCall.data,
              value: batchCall.value,
              account: currentAddress,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const clean = msg
              .replace(/EstimateGasExecutionError:?\s*/i, "")
              .replace(/Details:?\s*/i, "")
              .slice(0, 200);
            throw new Error(`Euler batch simulation failed: ${clean}`);
          }

          const hash = await walletClient.sendTransaction({
            to: batchCall.to as `0x${string}`,
            data: batchCall.data,
            value: batchCall.value,
            chain: walletClient.chain,
            account: currentAddress,
          });

          const receipt = await waitWithRetry(hash);
          if (receipt.status === "reverted") {
            throw new Error("Euler EVC batch transaction reverted on-chain");
          }
          updateStep(stepIdx, "done", hash);
        }
        stepIdx++;
      }

      // ---- Phase 3: Silo V2 direct calls ----
      if (bundle.siloSteps.length > 0) {
        setPhase("executing-silo");
        for (const step of bundle.siloSteps) {
          updateStep(stepIdx, "active");
          assertChain();
          assertAddress();

          // Simulate
          try {
            await publicClient.estimateGas({
              to: step.to as `0x${string}`,
              data: step.data,
              value: step.value,
              account: currentAddress,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Silo simulation failed (${step.label}): ${msg.slice(0, 200)}`);
          }

          const hash = await walletClient.sendTransaction({
            to: step.to as `0x${string}`,
            data: step.data,
            value: step.value,
            chain: walletClient.chain,
            account: currentAddress,
          });

          const receipt = await waitWithRetry(hash);
          if (receipt.status === "reverted") {
            throw new Error(`Silo transaction reverted: ${step.label}`);
          }
          updateStep(stepIdx, "done", hash);
          stepIdx++;
        }
      }

      // ---- Phase 4: Swaps via ParaSwap (Avalanche native) ----
      if (bundle.swapNodes.length > 0) {
        setPhase("swapping");
        for (const swapNode of bundle.swapNodes) {
          updateStep(stepIdx, "active");
          assertChain();
          assertAddress();

          const sd = swapNode.data as {
            tokenIn?: { address: string; decimals: number; symbol: string };
            tokenOut?: { address: string; decimals: number; symbol: string };
            amountIn?: string;
          };

          if (!sd.tokenIn || !sd.tokenOut || !sd.amountIn) {
            updateStep(stepIdx, "error");
            stepIdx++;
            continue;
          }

          const rawAmount = parseUnits(sd.amountIn, sd.tokenIn.decimals).toString();

          // 4a. Get ParaSwap price route
          const priceRes = await fetch(
            `https://api.paraswap.io/v5/prices?` +
              `srcToken=${sd.tokenIn.address}&destToken=${sd.tokenOut.address}` +
              `&amount=${rawAmount}&srcDecimals=${sd.tokenIn.decimals}` +
              `&destDecimals=${sd.tokenOut.decimals}&side=SELL&network=${AVALANCHE_CHAIN_ID}` +
              `&userAddress=${currentAddress}`
          );
          const priceData = await priceRes.json();

          if (!priceData.priceRoute) {
            throw new Error(
              `No swap route found for ${sd.tokenIn.symbol} -> ${sd.tokenOut.symbol}`
            );
          }

          // 4b. Build transaction via ParaSwap
          const txRes = await fetch(
            `https://api.paraswap.io/v5/transactions/${AVALANCHE_CHAIN_ID}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                srcToken: sd.tokenIn.address,
                destToken: sd.tokenOut.address,
                srcAmount: rawAmount,
                slippage: 100, // 1%
                priceRoute: priceData.priceRoute,
                userAddress: currentAddress,
                partner: "atala",
              }),
            }
          );
          const txData = await txRes.json();

          if (!txData.to || !txData.data) {
            throw new Error("Failed to build swap transaction from ParaSwap");
          }

          // 4c. Approve tokenIn to ParaSwap TokenTransferProxy if needed
          const tokenProxy = priceData.priceRoute.tokenTransferProxy;
          if (tokenProxy) {
            const tokenAllowance = await checkAllowance(
              sd.tokenIn.address as `0x${string}`,
              currentAddress,
              tokenProxy as `0x${string}`
            );
            const swapAmount = BigInt(rawAmount);

            if (tokenAllowance < swapAmount) {
              const MAX_APPROVAL = 2n ** 256n - 1n;
              const approveData = encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [tokenProxy as `0x${string}`, MAX_APPROVAL],
              });

              const approveHash = await walletClient.sendTransaction({
                to: sd.tokenIn.address as `0x${string}`,
                data: approveData,
                chain: walletClient.chain,
                account: currentAddress,
              });

              await waitWithRetry(approveHash);
            }
          }

          // 4d. Execute the swap
          const hash = await walletClient.sendTransaction({
            to: txData.to as `0x${string}`,
            data: txData.data as `0x${string}`,
            value: BigInt(txData.value || "0"),
            chain: walletClient.chain,
            account: currentAddress,
          });

          const receipt = await waitWithRetry(hash);
          if (receipt.status === "reverted") {
            throw new Error(
              `Swap ${sd.tokenIn.symbol} -> ${sd.tokenOut.symbol} reverted on-chain`
            );
          }
          updateStep(stepIdx, "done", hash);
          stepIdx++;
        }
      }

      // ---- Phase 5: Atala vault operations (ERC-4626) ----
      if (bundle.atalaSteps.length > 0) {
        setPhase("executing-atala");
        for (const step of bundle.atalaSteps) {
          updateStep(stepIdx, "active");
          assertChain();
          assertAddress();

          // Simulate
          try {
            await publicClient.estimateGas({
              to: step.to as `0x${string}`,
              data: step.data,
              value: step.value,
              account: currentAddress,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`Atala vault simulation failed (${step.label}): ${msg.slice(0, 200)}`);
          }

          const hash = await walletClient.sendTransaction({
            to: step.to as `0x${string}`,
            data: step.data,
            value: step.value,
            chain: walletClient.chain,
            account: currentAddress,
          });

          const receipt = await waitWithRetry(hash);
          if (receipt.status === "reverted") {
            throw new Error(`Atala vault transaction reverted: ${step.label}`);
          }
          updateStep(stepIdx, "done", hash);
          stepIdx++;
        }
      }

      setPhase("success");
      setShowConfirm(false);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Execution failed");
    } finally {
      isExecutingRef.current = false;
    }
  }, [
    address,
    walletClient,
    publicClient,
    nodes,
    edges,
    walletChainId,
    showConfirm,
    steps,
    checkAllowance,
    waitWithRetry,
  ]);

  // ---------- Reset handler ----------

  const handleReset = useCallback(() => {
    setPhase("idle");
    setShowConfirm(false);
    setError(null);
    setValidationErrors([]);
    setLiveSteps([]);
    setExpanded(false);
  }, []);

  // ---------- Render nothing if no actions ----------

  if (actionCount === 0) return null;

  const canExecute =
    validationErrors.length === 0 &&
    !blockingError &&
    isConnected &&
    !wrongChain;

  // ---------- UI ----------

  return (
    <>
      {/* Backdrop overlay during execution */}
      {isExecuting && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" />
      )}

      {/* Bottom-center panel */}
      <div
        className={`absolute bottom-0 left-1/2 -translate-x-1/2 ${
          isExecuting ? "z-50" : "z-30"
        }`}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => {
          if (!isExecuting && !showConfirm) {
            setExpanded(false);
          }
        }}
      >
        <div
          className={`rounded-t-2xl border border-b-0 border-white/[0.08] bg-[#0c1218]/95 shadow-2xl backdrop-blur-md transition-all duration-300 ${
            expanded || isExecuting ? "w-[520px]" : "w-[320px]"
          }`}
        >
          {/* Tab handle */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#55c3e9]/15">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M2 6h8M6 2v8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="text-[#55c3e9]"
                  />
                </svg>
              </div>
              <span className="text-sm font-semibold text-white">
                Execute Strategy
              </span>
            </div>
            {wrongChain ? (
              <span className="flex items-center gap-1 rounded-full bg-orange-400/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 1l7 13H1L8 1z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path d="M8 6v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="8" cy="11.5" r="0.6" fill="currentColor" />
                </svg>
                Wrong network
              </span>
            ) : phase === "success" ? (
              <span className="rounded-full bg-[#02c77b]/10 px-2 py-0.5 text-[10px] font-medium text-[#02c77b]">
                Success
              </span>
            ) : (
              <span className="rounded-full bg-[#55c3e9]/10 px-2 py-0.5 text-[10px] font-medium text-[#55c3e9]">
                {steps.length} step{steps.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Expandable content */}
          <div
            className={`overflow-hidden transition-all duration-300 ${
              expanded || isExecuting
                ? "max-h-[600px] opacity-100"
                : "max-h-0 opacity-0"
            }`}
          >
            <div className="border-t border-white/[0.08] px-5 py-4">
              {/* Steps timeline */}
              {(() => {
                const displaySteps: StepStatus[] =
                  showConfirm || isExecuting || phase === "success" || phase === "error"
                    ? liveSteps
                    : steps.map((s) => ({
                        label: s.label,
                        detail: s.detail,
                        stepType: s.type,
                        status: "pending" as const,
                      }));
                return displaySteps;
              })().length > 0 ? (
                <div className="relative max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                  <div className="space-y-0">
                    {(() => {
                      const displaySteps: StepStatus[] =
                        showConfirm || isExecuting || phase === "success" || phase === "error"
                          ? liveSteps
                          : steps.map((s) => ({
                              label: s.label,
                              detail: s.detail,
                              stepType: s.type,
                              status: "pending" as const,
                            }));
                      return displaySteps;
                    })().map((step, i, arr) => {
                      const isDone = step.status === "done";
                      const isActive = step.status === "active";
                      const isError = step.status === "error";
                      const isLast = i === arr.length - 1;

                      return (
                        <div key={i} className="relative flex items-start gap-3">
                          {/* Vertical connector */}
                          {!isLast && (
                            <div
                              className={`absolute left-[11px] top-6 w-[2px] ${
                                isDone
                                  ? "bg-[#02c77b]/40"
                                  : "border-l-2 border-dashed border-white/[0.08] bg-transparent"
                              }`}
                              style={{ height: "calc(100% - 4px)" }}
                            />
                          )}
                          {/* Circle */}
                          <div
                            className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              isDone
                                ? "border border-[#02c77b]/40 bg-[#02c77b]/10 text-[#02c77b]"
                                : isActive
                                  ? "border border-[#55c3e9]/40 bg-[#55c3e9]/10 text-[#55c3e9]"
                                  : isError
                                    ? "border border-[#eb365a]/40 bg-[#eb365a]/10 text-[#eb365a]"
                                    : "border border-white/[0.08] bg-white/[0.05] text-[#586878]"
                            }`}
                          >
                            {isDone ? (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : isActive ? (
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 16 16"
                                fill="none"
                                className="animate-spin"
                              >
                                <circle
                                  cx="8"
                                  cy="8"
                                  r="6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeOpacity="0.2"
                                />
                                <path
                                  d="M14 8a6 6 0 00-6-6"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : isError ? (
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path
                                  d="M3 3l6 6M9 3l-6 6"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              i + 1
                            )}
                          </div>
                          {/* Step card */}
                          <div
                            className={`mb-2 flex flex-1 items-center justify-between rounded-lg border px-3 py-2 ${
                              isDone
                                ? "border-[#02c77b]/20 bg-[#02c77b]/5"
                                : isError
                                  ? "border-[#eb365a]/20 bg-[#eb365a]/5"
                                  : "border-white/[0.08] bg-white/[0.03]"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-xs font-medium ${
                                  isDone
                                    ? "text-[#02c77b]"
                                    : isError
                                      ? "text-[#eb365a]"
                                      : "text-white"
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="truncate text-[10px] text-[#586878]">
                                {step.detail}
                              </p>
                              {step.txHash && (
                                <a
                                  href={`${SNOWTRACE_BASE}/tx/${step.txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-0.5 inline-flex items-center gap-1 text-[9px] text-[#55c3e9] hover:underline"
                                >
                                  {step.txHash.slice(0, 10)}...{step.txHash.slice(-6)}
                                  <svg
                                    width="8"
                                    height="8"
                                    viewBox="0 0 12 12"
                                    fill="none"
                                  >
                                    <path
                                      d="M3.5 8.5l5-5M4.5 3.5h4v4"
                                      stroke="currentColor"
                                      strokeWidth="1.2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </a>
                              )}
                            </div>
                            <span
                              className={`ml-2 shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider ${
                                isDone
                                  ? "border-[#02c77b]/20 bg-[#02c77b]/5 text-[#02c77b]"
                                  : typeColors[step.stepType] ??
                                    "border-white/[0.08] bg-white/[0.03] text-[#586878]"
                              }`}
                            >
                              {typeLabels[step.stepType] ?? step.stepType.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#586878]">
                  Configure your nodes to see the execution plan
                </p>
              )}

              {/* Validation errors */}
              {validationErrors.length > 0 && (
                <div className="mt-3 rounded-lg border border-[#eb365a]/20 bg-[#eb365a]/5 px-3 py-2">
                  {validationErrors.map((err, i) => (
                    <p key={i} className="text-[10px] text-[#eb365a]">
                      {err}
                    </p>
                  ))}
                </div>
              )}

              {/* Execution error */}
              {error && (
                <div className="mt-3 rounded-lg border border-[#eb365a]/20 bg-[#eb365a]/5 px-3 py-2 text-[10px] text-[#eb365a]">
                  {error}
                </div>
              )}

              {/* Success summary */}
              {phase === "success" && (
                <div className="mt-3 rounded-lg border border-[#02c77b]/20 bg-[#02c77b]/5 px-3 py-2">
                  <div className="flex items-center gap-2 text-[10px] font-medium text-[#02c77b]">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
                      <path
                        d="M5 8l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Strategy executed successfully on Avalanche
                  </div>
                </div>
              )}

              {/* Confirmation warning */}
              {showConfirm && !isExecuting && phase !== "success" && phase !== "error" && (
                <div className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-3 py-2">
                  <p className="text-[10px] font-medium text-yellow-400">
                    Review the steps above carefully. Click Execute again to sign.
                  </p>
                  <p className="mt-0.5 text-[9px] text-yellow-400/70">
                    Multi-phase execution: approvals, then protocol operations sequentially
                  </p>
                </div>
              )}

              {/* Blocking error */}
              {blockingError && (
                <div className="mt-3 rounded-lg border border-[#eb365a]/20 bg-[#eb365a]/5 px-3 py-2 text-[10px] text-[#eb365a]">
                  {blockingError} -- fix the issue above before executing
                </div>
              )}

              {/* Wrong chain warning */}
              {wrongChain && (
                <div className="mt-3 rounded-lg border border-orange-400/30 bg-orange-400/5 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="shrink-0 text-orange-400"
                    >
                      <path
                        d="M8 1l7 13H1L8 1z"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M8 6v3.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="8" cy="12" r="0.75" fill="currentColor" />
                    </svg>
                    <p className="text-[10px] font-medium text-orange-400">
                      Wrong network -- please switch to Avalanche C-Chain (43114)
                    </p>
                  </div>
                </div>
              )}

              {/* Summary bar */}
              <div className="mt-3 flex items-center justify-between rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[10px] text-[#586878]">
                <span>
                  {steps.length} action{steps.length !== 1 ? "s" : ""}
                </span>
                <span>
                  Euler via EVC batch
                  {steps.some((s) => s.type === "swap") ? " + ParaSwap" : ""}
                  {" + Silo + Atala direct"}
                </span>
              </div>

              {/* Action buttons */}
              {phase === "success" || phase === "error" ? (
                <button
                  onClick={handleReset}
                  className="mt-3 w-full rounded-xl border border-white/[0.08] bg-white/[0.05] py-3 text-sm font-medium text-[#8898a8] transition-colors hover:bg-white/[0.10]"
                >
                  {phase === "success" ? "Done" : "Dismiss"}
                </button>
              ) : (
                <div className="mt-3 flex gap-2">
                  {showConfirm && (
                    <button
                      onClick={handleReset}
                      disabled={isExecuting}
                      className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.05] py-3 text-sm text-[#8898a8] transition-colors hover:bg-white/[0.10] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={handleExecute}
                    disabled={!canExecute || isExecuting || steps.length === 0}
                    className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      blockingError || wrongChain
                        ? "bg-[#586878]"
                        : "bg-[#55c3e9] hover:bg-[#55c3e9]/90"
                    }`}
                  >
                    {!isConnected
                      ? "Connect Wallet"
                      : wrongChain
                        ? "Switch to Avalanche"
                        : blockingError
                          ? "Cannot Execute"
                          : isExecuting
                            ? "Processing..."
                            : showConfirm
                              ? `Confirm & Execute (${steps.length} actions)`
                              : `Execute Bundle (${steps.length} actions)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal overlay (for full-screen context) */}
      {showConfirm && !isExecuting && phase !== "success" && phase !== "error" && (
        <div
          className="fixed inset-0 z-30 bg-black/20"
          onClick={handleReset}
        />
      )}
    </>
  );
}
