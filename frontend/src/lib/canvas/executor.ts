/**
 * Canvas Executor — builds transaction calls for Euler V2, Silo V2, and Atala vaults.
 *
 * Euler V2: Uses EVC.batch() for atomic multi-step operations
 *   - enableCollateral, enableController, deposit, borrow, repay, withdraw
 *
 * Silo V2: Direct calls to Silo contracts
 *   - deposit, withdraw, borrow, repay (via Router or direct)
 *
 * Atala: Standard ERC-4626 deposit/withdraw
 */

import type { Edge } from "@xyflow/react";
import type { CanvasNode, CanvasNodeData } from "./types";
import { parseUnits, encodeFunctionData, type Hex } from "viem";
import { EULER_ADDRESSES } from "@/config/contracts";

// =============================================
// ABI fragments for encoding
// =============================================

const EVC_ABI = [
  {
    name: "batch",
    type: "function",
    inputs: [{
      name: "items",
      type: "tuple[]",
      components: [
        { name: "targetContract", type: "address" },
        { name: "onBehalfOfAccount", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
      ],
    }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    name: "enableCollateral",
    type: "function",
    inputs: [
      { name: "account", type: "address" },
      { name: "vault", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "enableController",
    type: "function",
    inputs: [
      { name: "account", type: "address" },
      { name: "vault", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const EULER_VAULT_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "borrow",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "repay",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

const SILO_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "borrow",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "repay",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

const ERC4626_ABI = [
  {
    name: "deposit",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "nonpayable",
  },
] as const;

// =============================================
// Types
// =============================================

export interface ApprovalRequest {
  token: string;
  spender: string;
  amount: bigint;
  symbol: string;
}

export interface TransactionStep {
  label: string;
  protocol: string;
  to: string;
  data: Hex;
  value: bigint;
}

export interface ExecutionBundle {
  /** ERC-20 approvals needed before execution */
  approvals: ApprovalRequest[];
  /** Euler steps batched via EVC.batch() */
  eulerBatchItems: {
    targetContract: string;
    onBehalfOfAccount: string;
    value: bigint;
    data: Hex;
  }[];
  /** Silo direct calls */
  siloSteps: TransactionStep[];
  /** Atala (ERC-4626) direct calls */
  atalaSteps: TransactionStep[];
  /** Whether we need a swap phase */
  hasSwaps: boolean;
  /** Swap nodes (processed separately via DEX) */
  swapNodes: CanvasNode[];
}

// =============================================
// Topological sort
// =============================================

export function topologicalSort(
  nodes: CanvasNode[],
  edges: Edge[]
): CanvasNode[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const nodeMap = new Map<string, CanvasNode>();

  for (const n of nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
    nodeMap.set(n.id, n);
  }
  for (const e of edges) {
    if (!adj.has(e.source)) continue;
    adj.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: CanvasNode[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodeMap.get(id);
    if (node) sorted.push(node);
    for (const t of adj.get(id) ?? []) {
      const newDeg = (inDegree.get(t) ?? 1) - 1;
      inDegree.set(t, newDeg);
      if (newDeg === 0) queue.push(t);
    }
  }

  if (sorted.length < nodes.length) {
    throw new Error("Cycle detected in graph");
  }
  return sorted;
}

// =============================================
// Build execution bundle
// =============================================

export function buildExecutionBundle(
  nodes: CanvasNode[],
  edges: Edge[],
  userAddress: string
): ExecutionBundle {
  const sorted = topologicalSort(nodes, edges);
  const approvals: ApprovalRequest[] = [];
  const eulerBatchItems: ExecutionBundle["eulerBatchItems"] = [];
  const siloSteps: TransactionStep[] = [];
  const atalaSteps: TransactionStep[] = [];
  const swapNodes: CanvasNode[] = [];

  const evc = EULER_ADDRESSES.EVC as `0x${string}`;
  const user = userAddress as `0x${string}`;

  for (const node of sorted) {
    const data = node.data as CanvasNodeData;

    switch (data.type) {
      case "wallet":
      case "position":
        // No-op source nodes
        break;

      case "eulerDeposit": {
        if (!data.vault) break;
        const vault = data.vault.address as `0x${string}`;
        const asset = data.vault.asset.address as `0x${string}`;
        const amount = parseUnits(data.amount || "0", data.vault.asset.decimals);
        if (amount <= 0n) break;

        // Approve asset to vault
        approvals.push({
          token: asset,
          spender: vault,
          amount,
          symbol: data.vault.asset.symbol,
        });

        // EVC: enableCollateral (so this vault can be used as collateral)
        eulerBatchItems.push({
          targetContract: evc,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EVC_ABI,
            functionName: "enableCollateral",
            args: [user, vault],
          }),
        });

        // Deposit into vault
        eulerBatchItems.push({
          targetContract: vault,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EULER_VAULT_ABI,
            functionName: "deposit",
            args: [amount, user],
          }),
        });
        break;
      }

      case "eulerBorrow": {
        if (!data.collateralVault || !data.borrowVault) break;
        const collVault = data.collateralVault.address as `0x${string}`;
        const collAsset = data.collateralVault.asset.address as `0x${string}`;
        const collAmount = parseUnits(
          data.collateralAmount || "0",
          data.collateralVault.asset.decimals
        );
        const borVault = data.borrowVault.address as `0x${string}`;
        const borAmount = parseUnits(
          String(data.borrowAmount || 0),
          data.borrowVault.asset.decimals
        );
        if (collAmount <= 0n || borAmount <= 0n) break;

        // 1. Approve collateral token to collateral vault
        approvals.push({
          token: collAsset,
          spender: collVault,
          amount: collAmount,
          symbol: data.collateralVault.asset.symbol,
        });

        // 2. EVC: enableCollateral (collateral vault)
        eulerBatchItems.push({
          targetContract: evc,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EVC_ABI,
            functionName: "enableCollateral",
            args: [user, collVault],
          }),
        });

        // 3. Deposit into collateral vault
        eulerBatchItems.push({
          targetContract: collVault,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EULER_VAULT_ABI,
            functionName: "deposit",
            args: [collAmount, user],
          }),
        });

        // 4. EVC: enableController (borrow vault)
        eulerBatchItems.push({
          targetContract: evc,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EVC_ABI,
            functionName: "enableController",
            args: [user, borVault],
          }),
        });

        // 5. Borrow from borrow vault
        eulerBatchItems.push({
          targetContract: borVault,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EULER_VAULT_ABI,
            functionName: "borrow",
            args: [borAmount, user],
          }),
        });
        break;
      }

      case "eulerWithdraw": {
        if (!data.position?.vault) break;
        const vault = data.position.vault.address as `0x${string}`;
        const amount = parseUnits(
          data.amount || "0",
          data.position.vault.asset.decimals
        );
        if (amount <= 0n) break;

        eulerBatchItems.push({
          targetContract: vault,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EULER_VAULT_ABI,
            functionName: "withdraw",
            args: [amount, user, user],
          }),
        });
        break;
      }

      case "eulerRepay": {
        if (!data.vault) break;
        const vault = data.vault.address as `0x${string}`;
        const asset = data.vault.asset.address as `0x${string}`;
        const amount = parseUnits(data.amount || "0", data.vault.asset.decimals);
        if (amount <= 0n) break;

        approvals.push({
          token: asset,
          spender: vault,
          amount,
          symbol: data.vault.asset.symbol,
        });

        eulerBatchItems.push({
          targetContract: vault,
          onBehalfOfAccount: user,
          value: 0n,
          data: encodeFunctionData({
            abi: EULER_VAULT_ABI,
            functionName: "repay",
            args: [amount, user],
          }),
        });
        break;
      }

      case "siloDeposit": {
        if (!data.pair) break;
        const silo = (data.side === 0 ? data.pair.silo0 : data.pair.silo1) as `0x${string}`;
        const token = data.side === 0 ? data.pair.token0 : data.pair.token1;
        const amount = parseUnits(data.amount || "0", token.decimals);
        if (amount <= 0n) break;

        approvals.push({
          token: token.address,
          spender: silo,
          amount,
          symbol: token.symbol,
        });

        siloSteps.push({
          label: `Deposit ${data.amount} ${token.symbol} into Silo`,
          protocol: "silo",
          to: silo,
          data: encodeFunctionData({
            abi: SILO_ABI,
            functionName: "deposit",
            args: [amount, user],
          }),
          value: 0n,
        });
        break;
      }

      case "siloBorrow": {
        if (!data.pair) break;
        const silo = (data.side === 0 ? data.pair.silo0 : data.pair.silo1) as `0x${string}`;
        const token = data.side === 0 ? data.pair.token0 : data.pair.token1;
        const amount = parseUnits(
          String(data.borrowAmount || 0),
          token.decimals
        );
        if (amount <= 0n) break;

        siloSteps.push({
          label: `Borrow ${data.borrowAmount} ${token.symbol} from Silo`,
          protocol: "silo",
          to: silo,
          data: encodeFunctionData({
            abi: SILO_ABI,
            functionName: "borrow",
            args: [amount, user],
          }),
          value: 0n,
        });
        break;
      }

      case "siloWithdraw": {
        if (!data.position?.pair) break;
        const pos = data.position;
        const silo = (pos.side === 0 ? pos.pair.silo0 : pos.pair.silo1) as `0x${string}`;
        const token = pos.side === 0 ? pos.pair.token0 : pos.pair.token1;
        const amount = parseUnits(data.amount || "0", token.decimals);
        if (amount <= 0n) break;

        siloSteps.push({
          label: `Withdraw ${data.amount} ${token.symbol} from Silo`,
          protocol: "silo",
          to: silo,
          data: encodeFunctionData({
            abi: SILO_ABI,
            functionName: "withdraw",
            args: [amount, user, user],
          }),
          value: 0n,
        });
        break;
      }

      case "siloRepay": {
        if (!data.pair) break;
        const silo = (data.side === 0 ? data.pair.silo0 : data.pair.silo1) as `0x${string}`;
        const token = data.side === 0 ? data.pair.token0 : data.pair.token1;
        const amount = parseUnits(data.amount || "0", token.decimals);
        if (amount <= 0n) break;

        approvals.push({
          token: token.address,
          spender: silo,
          amount,
          symbol: token.symbol,
        });

        siloSteps.push({
          label: `Repay ${data.amount} ${token.symbol} to Silo`,
          protocol: "silo",
          to: silo,
          data: encodeFunctionData({
            abi: SILO_ABI,
            functionName: "repay",
            args: [amount, user],
          }),
          value: 0n,
        });
        break;
      }

      case "swap": {
        swapNodes.push(node);
        break;
      }

      case "atalaDeposit": {
        if (!data.vault) break;
        const vault = data.vault.address as `0x${string}`;
        const asset = data.vault.asset.address as `0x${string}`;
        const amount = parseUnits(data.amount || "0", data.vault.asset.decimals);
        if (amount <= 0n) break;

        approvals.push({
          token: asset,
          spender: vault,
          amount,
          symbol: data.vault.asset.symbol,
        });

        atalaSteps.push({
          label: `Deposit ${data.amount} ${data.vault.asset.symbol} into Atala Vault`,
          protocol: "atala",
          to: vault,
          data: encodeFunctionData({
            abi: ERC4626_ABI,
            functionName: "deposit",
            args: [amount, user],
          }),
          value: 0n,
        });
        break;
      }

      case "atalaWithdraw": {
        if (!data.position?.vault) break;
        const vault = data.position.vault.address as `0x${string}`;
        const amount = parseUnits(
          data.amount || "0",
          data.position.vault.asset.decimals
        );
        if (amount <= 0n) break;

        atalaSteps.push({
          label: `Withdraw ${data.amount} from Atala Vault`,
          protocol: "atala",
          to: vault,
          data: encodeFunctionData({
            abi: ERC4626_ABI,
            functionName: "withdraw",
            args: [amount, user, user],
          }),
          value: 0n,
        });
        break;
      }
    }
  }

  // Deduplicate approvals (same token+spender → take max)
  const approvalMap = new Map<string, ApprovalRequest>();
  for (const a of approvals) {
    const key = `${a.token.toLowerCase()}-${a.spender.toLowerCase()}`;
    const existing = approvalMap.get(key);
    if (!existing || a.amount > existing.amount) {
      approvalMap.set(key, a);
    }
  }

  return {
    approvals: Array.from(approvalMap.values()),
    eulerBatchItems,
    siloSteps,
    atalaSteps,
    hasSwaps: swapNodes.length > 0,
    swapNodes,
  };
}

/**
 * Encode the EVC batch call for all Euler operations.
 */
export function encodeEvcBatch(
  batchItems: ExecutionBundle["eulerBatchItems"]
): { to: string; data: Hex; value: bigint } | null {
  if (batchItems.length === 0) return null;

  const data = encodeFunctionData({
    abi: EVC_ABI,
    functionName: "batch",
    args: [
      batchItems.map((item) => ({
        targetContract: item.targetContract as `0x${string}`,
        onBehalfOfAccount: item.onBehalfOfAccount as `0x${string}`,
        value: item.value,
        data: item.data,
      })),
    ],
  });

  return {
    to: EULER_ADDRESSES.EVC,
    data,
    value: 0n,
  };
}

/**
 * Encode an ERC-20 approve call.
 */
export function encodeApproval(
  token: string,
  spender: string,
  amount: bigint
): { to: string; data: Hex } {
  return {
    to: token,
    data: encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [spender as `0x${string}`, amount],
    }),
  };
}
