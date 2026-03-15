import type { Node } from "@xyflow/react";

// --- Token / Asset types ---

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface TokenWithBalance extends TokenInfo {
  balance: string;
  balanceRaw: bigint;
}

// --- Euler V2 types ---

export interface EulerVaultInfo {
  address: string;
  name: string;
  symbol: string;
  asset: TokenInfo;
  totalAssets: bigint;
  totalBorrows: bigint;
  supplyAPY: number;
  borrowAPY: number;
  utilization: number;
}

// --- Silo V2 types ---

export interface SiloPairInfo {
  configAddress: string;
  silo0: string;
  silo1: string;
  token0: TokenInfo;
  token1: TokenInfo;
  totalDeposits0: bigint;
  totalDeposits1: bigint;
  totalBorrows0: bigint;
  totalBorrows1: bigint;
  supplyAPY0: number;
  supplyAPY1: number;
  borrowAPY0: number;
  borrowAPY1: number;
  utilization0: number;
  utilization1: number;
}

// --- Atala Vault types ---

export interface AtalaVaultInfo {
  address: string;
  name: string;
  symbol: string;
  asset: TokenInfo;
  totalAssets: bigint;
  idle: bigint;
}

// --- Position types (on-chain) ---

export interface EulerPosition {
  vault: EulerVaultInfo;
  supplyShares: bigint;
  supplyAssets: bigint;
  borrowShares: bigint;
  borrowAssets: bigint;
}

export interface SiloPosition {
  pair: SiloPairInfo;
  /** Which side: 0 or 1 */
  side: 0 | 1;
  depositAssets: bigint;
  borrowAssets: bigint;
}

export interface AtalaPosition {
  vault: AtalaVaultInfo;
  shares: bigint;
  assets: bigint;
}

// =============================================
// NODE DATA INTERFACES
// =============================================

export interface WalletNodeData {
  [key: string]: unknown;
  type: "wallet";
  address: string | undefined;
  balances: TokenWithBalance[];
}

export interface EulerDepositNodeData {
  [key: string]: unknown;
  type: "eulerDeposit";
  vault: EulerVaultInfo | null;
  amount: string;
  amountUsd: number;
}

export interface EulerBorrowNodeData {
  [key: string]: unknown;
  type: "eulerBorrow";
  collateralVault: EulerVaultInfo | null;
  collateralAmount: string;
  borrowVault: EulerVaultInfo | null;
  ltvPercent: number;
  borrowAmount: number;
  borrowAmountUsd: number;
  healthFactor: number | null;
}

export interface EulerWithdrawNodeData {
  [key: string]: unknown;
  type: "eulerWithdraw";
  position: EulerPosition | null;
  amount: string;
}

export interface EulerRepayNodeData {
  [key: string]: unknown;
  type: "eulerRepay";
  vault: EulerVaultInfo | null;
  amount: string;
  amountUsd: number;
}

export interface SiloDepositNodeData {
  [key: string]: unknown;
  type: "siloDeposit";
  pair: SiloPairInfo | null;
  /** Which side of the pair to deposit into (0 or 1) */
  side: 0 | 1;
  amount: string;
  amountUsd: number;
}

export interface SiloBorrowNodeData {
  [key: string]: unknown;
  type: "siloBorrow";
  pair: SiloPairInfo | null;
  /** Borrow from the opposite side of deposit */
  side: 0 | 1;
  ltvPercent: number;
  borrowAmount: number;
  borrowAmountUsd: number;
  healthFactor: number | null;
  depositAmountUsd: number;
}

export interface SiloWithdrawNodeData {
  [key: string]: unknown;
  type: "siloWithdraw";
  position: SiloPosition | null;
  amount: string;
}

export interface SiloRepayNodeData {
  [key: string]: unknown;
  type: "siloRepay";
  pair: SiloPairInfo | null;
  side: 0 | 1;
  amount: string;
  amountUsd: number;
}

export interface SwapNodeData {
  [key: string]: unknown;
  type: "swap";
  tokenIn: TokenInfo | null;
  tokenOut: TokenInfo | null;
  amountIn: string;
  quoteOut: string;
  quoteLoading: boolean;
}

export interface AtalaDepositNodeData {
  [key: string]: unknown;
  type: "atalaDeposit";
  vault: AtalaVaultInfo | null;
  amount: string;
  amountUsd: number;
  depositAll?: boolean;
}

export interface AtalaWithdrawNodeData {
  [key: string]: unknown;
  type: "atalaWithdraw";
  position: AtalaPosition | null;
  amount: string;
}

export interface PositionNodeData {
  [key: string]: unknown;
  type: "position";
  protocol: "euler" | "silo" | "atala";
  eulerPosition: EulerPosition | null;
  siloPosition: SiloPosition | null;
  atalaPosition: AtalaPosition | null;
}

// --- Union type ---

export type CanvasNodeData =
  | WalletNodeData
  | EulerDepositNodeData
  | EulerBorrowNodeData
  | EulerWithdrawNodeData
  | EulerRepayNodeData
  | SiloDepositNodeData
  | SiloBorrowNodeData
  | SiloWithdrawNodeData
  | SiloRepayNodeData
  | SwapNodeData
  | AtalaDepositNodeData
  | AtalaWithdrawNodeData
  | PositionNodeData;

export type CanvasNode = Node<CanvasNodeData>;

// =============================================
// VALID CONNECTIONS MAP
// =============================================

export const VALID_CONNECTIONS: Record<string, string[]> = {
  // Wallet can start: deposit, swap, repay, or standalone borrow
  wallet: [
    "eulerDeposit", "siloDeposit", "atalaDeposit",
    "swap",
    "eulerRepay", "siloRepay",
    "eulerBorrow",
  ],

  // Euler deposit can lead to: borrow, swap (withdraw yield), or be terminal
  eulerDeposit: ["eulerBorrow", "swap"],

  // Euler borrow output can go to: swap, deposit elsewhere, or repay
  eulerBorrow: [
    "swap",
    "eulerDeposit", "siloDeposit", "atalaDeposit",
  ],

  // Euler withdraw can go to: swap, deposit elsewhere, or repay
  eulerWithdraw: [
    "swap",
    "eulerDeposit", "siloDeposit", "atalaDeposit",
    "eulerRepay", "siloRepay",
  ],

  // Euler repay is terminal
  eulerRepay: [],

  // Silo deposit can lead to: borrow
  siloDeposit: ["siloBorrow"],

  // Silo borrow output can go to: swap, deposit elsewhere
  siloBorrow: [
    "swap",
    "eulerDeposit", "siloDeposit", "atalaDeposit",
  ],

  // Silo withdraw can go to: swap, deposit elsewhere, or repay
  siloWithdraw: [
    "swap",
    "eulerDeposit", "siloDeposit", "atalaDeposit",
    "eulerRepay", "siloRepay",
  ],

  // Silo repay is terminal
  siloRepay: [],

  // Swap output can go to: any deposit, repay, or back to wallet
  swap: [
    "eulerDeposit", "siloDeposit", "atalaDeposit",
    "eulerRepay", "siloRepay",
    "wallet",
  ],

  // Atala deposit is terminal (aggregator vault)
  atalaDeposit: [],

  // Atala withdraw can go to: swap, deposit elsewhere, or repay
  atalaWithdraw: [
    "swap",
    "eulerDeposit", "siloDeposit", "atalaDeposit",
    "eulerRepay", "siloRepay",
  ],

  // Position (read-only) can start: withdraw or swap
  position: [
    "eulerWithdraw", "siloWithdraw", "atalaWithdraw",
    "swap",
  ],
};

// =============================================
// NODE COLORS
// =============================================

export const NODE_COLORS: Record<string, string> = {
  wallet: "#55c3e9",
  eulerDeposit: "#2973ff",
  eulerBorrow: "#39a699",
  eulerWithdraw: "#f97316",
  eulerRepay: "#ef4444",
  siloDeposit: "#8b5cf6",
  siloBorrow: "#06b6d4",
  siloWithdraw: "#f59e0b",
  siloRepay: "#ef4444",
  swap: "#eab308",
  atalaDeposit: "#a855f7",
  atalaWithdraw: "#f97316",
  position: "#6b7079",
};

// =============================================
// DRAGGABLE NODE TYPES (sidebar)
// =============================================

export const DRAGGABLE_NODE_TYPES = [
  // Euler V2
  { type: "eulerDeposit", label: "Euler Deposit", icon: "E+", shortcut: "E", protocol: "euler" },
  { type: "eulerBorrow", label: "Euler Borrow", icon: "EB", shortcut: "B", protocol: "euler" },
  { type: "eulerWithdraw", label: "Euler Withdraw", icon: "EW", shortcut: "W", protocol: "euler" },
  { type: "eulerRepay", label: "Euler Repay", icon: "ER", shortcut: "Y", protocol: "euler" },
  // Silo V2
  { type: "siloDeposit", label: "Silo Deposit", icon: "S+", shortcut: "S", protocol: "silo" },
  { type: "siloBorrow", label: "Silo Borrow", icon: "SB", shortcut: "O", protocol: "silo" },
  { type: "siloWithdraw", label: "Silo Withdraw", icon: "SW", shortcut: "I", protocol: "silo" },
  { type: "siloRepay", label: "Silo Repay", icon: "SR", shortcut: "P", protocol: "silo" },
  // Swap
  { type: "swap", label: "Swap", icon: "X", shortcut: "X", protocol: "dex" },
  // Atala
  { type: "atalaDeposit", label: "Atala Deposit", icon: "A+", shortcut: "D", protocol: "atala" },
  { type: "atalaWithdraw", label: "Atala Withdraw", icon: "AW", shortcut: "A", protocol: "atala" },
] as const;

/** Keyboard shortcut -> node type mapping */
export const NODE_SHORTCUTS: Record<string, string> = Object.fromEntries(
  DRAGGABLE_NODE_TYPES.map((t) => [t.shortcut.toLowerCase(), t.type])
);
