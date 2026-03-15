import type { Edge } from "@xyflow/react";
import type {
  CanvasNode,
  CanvasNodeData,
  EulerPosition,
  SiloPosition,
  AtalaPosition,
} from "./types";

const COL = { wallet: 50, deposit: 380, borrow: 710, yield: 1040 };
const ROW_GAP = 220;
const START_Y = 80;
const STORAGE_KEY = "atala-canvas-import";

export interface ImportedStrategy {
  nodes: CanvasNode[];
  edges: Edge[];
  sourceAddress: string;
}

/**
 * Build a canvas from on-chain positions across Euler V2, Silo V2, and Atala vaults.
 */
export function buildStrategyFromPositions(
  address: string,
  eulerPositions: EulerPosition[],
  siloPositions: SiloPosition[],
  atalaPositions: AtalaPosition[]
): ImportedStrategy {
  const nodes: CanvasNode[] = [];
  const edges: Edge[] = [];
  let counter = 0;
  const makeId = (prefix: string) => `import-${prefix}-${++counter}`;

  // Wallet node
  const walletId = makeId("wallet");
  nodes.push({
    id: walletId,
    type: "walletNode",
    position: { x: COL.wallet, y: START_Y },
    data: { type: "wallet", address, balances: [] },
  });

  let row = 0;

  // --- Euler V2 positions ---
  const eulerBorrows = eulerPositions.filter((p) => p.borrowAssets > 0n);
  const eulerSupplyOnly = eulerPositions.filter(
    (p) => p.supplyAssets > 0n && p.borrowAssets === 0n
  );

  for (const pos of eulerBorrows) {
    const y = START_Y + row * ROW_GAP;

    // EulerDeposit (collateral)
    const depositId = makeId("euler-deposit");
    const supplyAmt = (
      Number(pos.supplyAssets) / 10 ** pos.vault.asset.decimals
    ).toFixed(6);

    nodes.push({
      id: depositId,
      type: "eulerDepositNode",
      position: { x: COL.deposit, y },
      data: {
        type: "eulerDeposit",
        vault: pos.vault,
        amount: supplyAmt,
        amountUsd: 0,
      } as CanvasNodeData,
    });

    edges.push({
      id: `${walletId}-${depositId}`,
      source: walletId, target: depositId,
      type: "animatedEdge", animated: true,
    });

    // EulerBorrow
    const borrowId = makeId("euler-borrow");
    const borrowAmt = Number(pos.borrowAssets) / 10 ** pos.vault.asset.decimals;

    nodes.push({
      id: borrowId,
      type: "eulerBorrowNode",
      position: { x: COL.borrow, y },
      data: {
        type: "eulerBorrow",
        collateralVault: pos.vault,
        collateralAmount: "",
        borrowVault: null,
        ltvPercent: 50,
        borrowAmount: borrowAmt,
        borrowAmountUsd: 0,
        healthFactor: null,
      } as CanvasNodeData,
    });

    edges.push({
      id: `${depositId}-${borrowId}`,
      source: depositId, target: borrowId,
      type: "animatedEdge", animated: true,
    });

    row++;
  }

  // Euler supply-only
  for (const pos of eulerSupplyOnly) {
    const y = START_Y + row * ROW_GAP;
    const depositId = makeId("euler-deposit-only");
    const amt = (Number(pos.supplyAssets) / 10 ** pos.vault.asset.decimals).toFixed(6);

    nodes.push({
      id: depositId,
      type: "eulerDepositNode",
      position: { x: COL.deposit, y },
      data: {
        type: "eulerDeposit",
        vault: pos.vault,
        amount: amt,
        amountUsd: 0,
      } as CanvasNodeData,
    });

    edges.push({
      id: `${walletId}-${depositId}`,
      source: walletId, target: depositId,
      type: "animatedEdge", animated: true,
    });

    row++;
  }

  // --- Silo V2 positions ---
  const siloBorrows = siloPositions.filter((p) => p.borrowAssets > 0n);
  const siloDepositOnly = siloPositions.filter(
    (p) => p.depositAssets > 0n && p.borrowAssets === 0n
  );

  for (const pos of siloBorrows) {
    const y = START_Y + row * ROW_GAP;
    const token = pos.side === 0 ? pos.pair.token0 : pos.pair.token1;
    const borrowToken = pos.side === 0 ? pos.pair.token1 : pos.pair.token0;

    const depositId = makeId("silo-deposit");
    const depositAmt = (Number(pos.depositAssets) / 10 ** token.decimals).toFixed(6);

    nodes.push({
      id: depositId,
      type: "siloDepositNode",
      position: { x: COL.deposit, y },
      data: {
        type: "siloDeposit",
        pair: pos.pair,
        side: pos.side,
        amount: depositAmt,
        amountUsd: 0,
      } as CanvasNodeData,
    });

    edges.push({
      id: `${walletId}-${depositId}`,
      source: walletId, target: depositId,
      type: "animatedEdge", animated: true,
    });

    const borrowId = makeId("silo-borrow");
    const borrowAmt = Number(pos.borrowAssets) / 10 ** borrowToken.decimals;

    nodes.push({
      id: borrowId,
      type: "siloBorrowNode",
      position: { x: COL.borrow, y },
      data: {
        type: "siloBorrow",
        pair: pos.pair,
        side: pos.side === 0 ? 1 : 0,
        ltvPercent: 50,
        borrowAmount: borrowAmt,
        borrowAmountUsd: 0,
        healthFactor: null,
        depositAmountUsd: 0,
      } as CanvasNodeData,
    });

    edges.push({
      id: `${depositId}-${borrowId}`,
      source: depositId, target: borrowId,
      type: "animatedEdge", animated: true,
    });

    row++;
  }

  for (const pos of siloDepositOnly) {
    const y = START_Y + row * ROW_GAP;
    const token = pos.side === 0 ? pos.pair.token0 : pos.pair.token1;
    const depositId = makeId("silo-deposit-only");
    const amt = (Number(pos.depositAssets) / 10 ** token.decimals).toFixed(6);

    nodes.push({
      id: depositId,
      type: "siloDepositNode",
      position: { x: COL.deposit, y },
      data: {
        type: "siloDeposit",
        pair: pos.pair,
        side: pos.side,
        amount: amt,
        amountUsd: 0,
      } as CanvasNodeData,
    });

    edges.push({
      id: `${walletId}-${depositId}`,
      source: walletId, target: depositId,
      type: "animatedEdge", animated: true,
    });

    row++;
  }

  // --- Atala vault positions ---
  for (const pos of atalaPositions) {
    const y = START_Y + row * ROW_GAP;
    const depositId = makeId("atala-deposit");
    const amt = (Number(pos.assets) / 10 ** pos.vault.asset.decimals).toFixed(6);

    nodes.push({
      id: depositId,
      type: "atalaDepositNode",
      position: { x: COL.yield, y },
      data: {
        type: "atalaDeposit",
        vault: pos.vault,
        amount: amt,
        amountUsd: 0,
      } as CanvasNodeData,
    });

    // Direct wallet -> atala deposit
    edges.push({
      id: `${walletId}-${depositId}`,
      source: walletId, target: depositId,
      type: "animatedEdge", animated: true,
    });

    row++;
  }

  return { nodes, edges, sourceAddress: address };
}

/** Save imported strategy to localStorage */
export function saveImportedStrategy(strategy: ImportedStrategy) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(strategy));
}

const VALID_NODE_TYPES = new Set([
  "walletNode",
  "eulerDepositNode", "eulerBorrowNode", "eulerWithdrawNode", "eulerRepayNode",
  "siloDepositNode", "siloBorrowNode", "siloWithdrawNode", "siloRepayNode",
  "swapNode",
  "atalaDepositNode", "atalaWithdrawNode",
  "positionNode",
]);

const VALID_DATA_TYPES = new Set([
  "wallet",
  "eulerDeposit", "eulerBorrow", "eulerWithdraw", "eulerRepay",
  "siloDeposit", "siloBorrow", "siloWithdraw", "siloRepay",
  "swap",
  "atalaDeposit", "atalaWithdraw",
  "position",
]);

function isValidImportedStrategy(data: unknown): data is ImportedStrategy {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.nodes) || !Array.isArray(obj.edges)) return false;
  if (typeof obj.sourceAddress !== "string" || obj.sourceAddress.length > 100) return false;
  if (obj.nodes.length > 200 || obj.edges.length > 500) return false;

  for (const node of obj.nodes) {
    if (!node || typeof node !== "object") return false;
    const n = node as Record<string, unknown>;
    if (typeof n.id !== "string") return false;
    if (typeof n.type !== "string" || !VALID_NODE_TYPES.has(n.type)) return false;
    if (!n.position || typeof n.position !== "object") return false;
    if (!n.data || typeof n.data !== "object") return false;
    const d = n.data as Record<string, unknown>;
    if (typeof d.type !== "string" || !VALID_DATA_TYPES.has(d.type)) return false;
  }

  for (const edge of obj.edges) {
    if (!edge || typeof edge !== "object") return false;
    const e = edge as Record<string, unknown>;
    if (typeof e.id !== "string") return false;
    if (typeof e.source !== "string") return false;
    if (typeof e.target !== "string") return false;
    if (e.source === e.target) return false;
  }

  return true;
}

/** Load and consume imported strategy */
export function consumeImportedStrategy(): ImportedStrategy | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    localStorage.removeItem(STORAGE_KEY);
    if (raw.length > 500_000) return null;
    const parsed = JSON.parse(raw);
    if (!isValidImportedStrategy(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
