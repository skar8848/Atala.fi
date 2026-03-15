import type { Edge, Connection } from "@xyflow/react";
import type { CanvasNode } from "./types";
import { VALID_CONNECTIONS } from "./types";
import { isAddress } from "viem";

function safeParseAmount(value: string | undefined | null): number {
  if (!value) return 0;
  const num = parseFloat(value);
  if (!isFinite(num) || num < 0) return 0;
  return num;
}

function isValidDecimals(decimals: unknown): decimals is number {
  return typeof decimals === "number" && Number.isInteger(decimals) && decimals >= 0 && decimals <= 18;
}

function isValidAddr(addr: unknown): addr is string {
  return typeof addr === "string" && isAddress(addr);
}

/**
 * Check if a connection between two nodes is valid.
 */
export function isValidConnection(
  connection: Connection,
  nodes: CanvasNode[]
): boolean {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;
  if (connection.source === connection.target) return false;

  const sourceType = (sourceNode.data as { type?: string }).type;
  const targetType = (targetNode.data as { type?: string }).type;
  if (!sourceType || !targetType) return false;

  const allowed = VALID_CONNECTIONS[sourceType];
  if (!allowed) return false;

  return allowed.includes(targetType);
}

/**
 * Hints for invalid connection attempts.
 */
export function getConnectionHint(
  connection: Connection,
  nodes: CanvasNode[]
): { message: string; highlightType: string } | null {
  const sourceNode = nodes.find((n) => n.id === connection.source);
  const targetNode = nodes.find((n) => n.id === connection.target);
  if (!sourceNode || !targetNode) return null;

  const sourceType = (sourceNode.data as { type?: string }).type;
  const targetType = (targetNode.data as { type?: string }).type;
  if (!sourceType || !targetType) return null;

  // Wallet -> Borrow: need to deposit first
  if (sourceType === "wallet" && (targetType === "eulerBorrow" || targetType === "siloBorrow")) {
    return {
      message: "You need to deposit collateral first",
      highlightType: targetType === "eulerBorrow" ? "eulerDeposit" : "siloDeposit",
    };
  }

  // Swap -> Borrow: need to deposit first
  if (sourceType === "swap" && (targetType === "eulerBorrow" || targetType === "siloBorrow")) {
    return {
      message: "Deposit the swapped tokens as collateral first",
      highlightType: targetType === "eulerBorrow" ? "eulerDeposit" : "siloDeposit",
    };
  }

  // Borrow -> Borrow: not valid
  if (
    (sourceType === "eulerBorrow" || sourceType === "siloBorrow") &&
    (targetType === "eulerBorrow" || targetType === "siloBorrow")
  ) {
    return {
      message: "Connect borrow output to a swap or deposit",
      highlightType: "swap",
    };
  }

  return null;
}

/**
 * Validate entire graph. Returns error messages (empty = valid).
 */
export function validateGraph(
  nodes: CanvasNode[],
  edges: Edge[]
): string[] {
  const errors: string[] = [];

  // Self-loop and duplicate edge detection
  const seenEdges = new Set<string>();
  for (const edge of edges) {
    if (edge.source === edge.target) {
      errors.push(`Edge ${edge.id}: self-loop not allowed`);
    }
    const edgeKey = `${edge.source}->${edge.target}`;
    if (seenEdges.has(edgeKey)) {
      errors.push(`Duplicate edge: ${edge.source} -> ${edge.target}`);
    }
    seenEdges.add(edgeKey);
  }

  // Cycle detection via topological sort
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjList.set(node.id, []);
  }
  for (const edge of edges) {
    if (!inDegree.has(edge.source) || !inDegree.has(edge.target)) {
      errors.push(`Edge ${edge.id}: references non-existent node`);
      continue;
    }
    if (edge.source === edge.target) continue;
    adjList.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }
  let sortedCount = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    sortedCount++;
    for (const neighbor of adjList.get(id) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  if (sortedCount < nodes.length) {
    errors.push("Graph contains a cycle — remove circular connections");
  }

  // Node-level validation
  for (const node of nodes) {
    const data = node.data as { type?: string };
    if (!data.type) {
      errors.push(`Node ${node.id}: missing type`);
      continue;
    }

    switch (data.type) {
      case "eulerDeposit": {
        const d = node.data as { vault?: { address?: string; asset?: { decimals?: number } }; amount?: string };
        if (!d.vault) {
          errors.push("Euler Deposit: no vault selected");
        } else {
          if (!isValidAddr(d.vault.address)) errors.push("Euler Deposit: invalid vault address");
          if (!isValidDecimals(d.vault.asset?.decimals)) errors.push("Euler Deposit: invalid decimals");
        }
        if (safeParseAmount(d.amount) <= 0) errors.push("Euler Deposit: no amount set");
        break;
      }

      case "eulerBorrow": {
        const d = node.data as {
          vault?: { address?: string; asset?: { decimals?: number } };
          collateralVault?: { address?: string };
          borrowAmount?: number;
        };
        if (!d.vault) {
          errors.push("Euler Borrow: no vault selected");
        } else {
          if (!isValidAddr(d.vault.address)) errors.push("Euler Borrow: invalid vault address");
          if (!isValidDecimals(d.vault.asset?.decimals)) errors.push("Euler Borrow: invalid decimals");
        }
        if (!d.collateralVault) {
          errors.push("Euler Borrow: no collateral vault");
        }
        if (!d.borrowAmount || !isFinite(d.borrowAmount) || d.borrowAmount <= 0)
          errors.push("Euler Borrow: no borrow amount");
        break;
      }

      case "eulerWithdraw": {
        const d = node.data as {
          position?: { vault?: { address?: string; asset?: { decimals?: number } } };
          amount?: string;
        };
        if (!d.position) {
          errors.push("Euler Withdraw: no position selected");
        } else {
          if (!isValidAddr(d.position.vault?.address)) errors.push("Euler Withdraw: invalid vault address");
          if (!isValidDecimals(d.position.vault?.asset?.decimals)) errors.push("Euler Withdraw: invalid decimals");
        }
        if (safeParseAmount(d.amount) <= 0) errors.push("Euler Withdraw: no amount");
        break;
      }

      case "eulerRepay": {
        const d = node.data as {
          vault?: { address?: string; asset?: { decimals?: number } };
          amount?: string;
        };
        if (!d.vault) {
          errors.push("Euler Repay: no vault selected");
        } else {
          if (!isValidAddr(d.vault.address)) errors.push("Euler Repay: invalid vault address");
        }
        if (safeParseAmount(d.amount) <= 0) errors.push("Euler Repay: no amount");
        break;
      }

      case "siloDeposit": {
        const d = node.data as {
          pair?: { configAddress?: string; token0?: { decimals?: number }; token1?: { decimals?: number } };
          side?: number;
          amount?: string;
        };
        if (!d.pair) {
          errors.push("Silo Deposit: no market selected");
        } else {
          if (!isValidAddr(d.pair.configAddress)) errors.push("Silo Deposit: invalid config address");
          const token = d.side === 0 ? d.pair.token0 : d.pair.token1;
          if (!isValidDecimals(token?.decimals)) errors.push("Silo Deposit: invalid decimals");
        }
        if (safeParseAmount(d.amount) <= 0) errors.push("Silo Deposit: no amount set");
        break;
      }

      case "siloBorrow": {
        const d = node.data as {
          pair?: { configAddress?: string };
          borrowAmount?: number;
        };
        if (!d.pair) {
          errors.push("Silo Borrow: no market selected");
        }
        if (!d.borrowAmount || !isFinite(d.borrowAmount) || d.borrowAmount <= 0)
          errors.push("Silo Borrow: no borrow amount");
        break;
      }

      case "siloWithdraw": {
        const d = node.data as {
          position?: { pair?: { configAddress?: string } };
          amount?: string;
        };
        if (!d.position) errors.push("Silo Withdraw: no position selected");
        if (safeParseAmount(d.amount) <= 0) errors.push("Silo Withdraw: no amount");
        break;
      }

      case "siloRepay": {
        const d = node.data as {
          pair?: { configAddress?: string };
          amount?: string;
        };
        if (!d.pair) errors.push("Silo Repay: no market selected");
        if (safeParseAmount(d.amount) <= 0) errors.push("Silo Repay: no amount");
        break;
      }

      case "swap": {
        const d = node.data as {
          tokenIn?: { address?: string };
          tokenOut?: { address?: string };
          amountIn?: string;
        };
        if (!d.tokenIn || !d.tokenOut)
          errors.push("Swap: missing token");
        else {
          if (!isValidAddr(d.tokenIn.address)) errors.push("Swap: invalid tokenIn address");
          if (!isValidAddr(d.tokenOut.address)) errors.push("Swap: invalid tokenOut address");
        }
        if (safeParseAmount(d.amountIn) <= 0) errors.push("Swap: no amount");
        break;
      }

      case "atalaDeposit": {
        const d = node.data as {
          vault?: { address?: string; asset?: { decimals?: number } };
          amount?: string;
          depositAll?: boolean;
        };
        if (!d.vault) {
          errors.push("Atala Deposit: no vault selected");
        } else {
          if (!isValidAddr(d.vault.address)) errors.push("Atala Deposit: invalid vault address");
        }
        if (!d.depositAll && safeParseAmount(d.amount) <= 0)
          errors.push("Atala Deposit: no amount");
        break;
      }

      case "atalaWithdraw": {
        const d = node.data as {
          position?: { vault?: { address?: string } };
          amount?: string;
        };
        if (!d.position) errors.push("Atala Withdraw: no position selected");
        if (safeParseAmount(d.amount) <= 0) errors.push("Atala Withdraw: no amount");
        break;
      }
    }
  }

  // Check disconnected non-root nodes
  for (const node of nodes) {
    const data = node.data as { type?: string };
    const rootTypes = ["wallet", "position", "eulerWithdraw", "siloWithdraw", "atalaWithdraw"];
    if (rootTypes.includes(data.type ?? "")) continue;
    // Terminal types don't need outgoing
    const terminalTypes = ["eulerRepay", "siloRepay", "atalaDeposit"];
    if (terminalTypes.includes(data.type ?? "")) {
      // But they need incoming
      const hasIncoming = edges.some((e) => e.target === node.id);
      if (!hasIncoming) errors.push(`${data.type}: not connected to any input`);
      continue;
    }
    const hasIncoming = edges.some((e) => e.target === node.id);
    if (!hasIncoming) {
      errors.push(`${data.type}: not connected to any input`);
    }
  }

  return errors;
}
