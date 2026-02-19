import { avalanche, avalancheFuji } from "wagmi/chains";
import { erc4626Abi } from "./abis";

// AtalaFactory addresses per chain (deploy to Fuji first, mainnet later)
// Mutable - updated at runtime after deploying from the UI
export const ATALA_FACTORY_ADDRESS: Record<number, `0x${string}`> = {
  [avalancheFuji.id]: "0x1cc40e75e17f002d86dd0673477faa0e2f7a420b",
  [avalanche.id]: "0x0000000000000000000000000000000000000000",
};

// EVC address (same CREATE2 address on all chains)
export const EVC_ADDRESS = "0xddcbe30A761Edd2e19bba930A977475265F36Fa1" as const;

// Minimal ABI for AtalaFactory
export const atalaFactoryAbi = [
  // Constructor (needed for deployContract)
  {
    inputs: [{ name: "_evc", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      { name: "asset", type: "address" },
      { name: "name", type: "string" },
      { name: "symbol", type: "string" },
      { name: "initialOwner", type: "address" },
    ],
    name: "createVault",
    outputs: [{ name: "vault", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "deployer", type: "address" }],
    name: "getVaultsByDeployer",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllVaults",
    outputs: [{ type: "address[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalVaults",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "vault", type: "address" }],
    name: "isAtalaVault",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "evc",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  // VaultCreated event for parsing tx receipts
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "vault", type: "address" },
      { indexed: true, name: "asset", type: "address" },
      { indexed: true, name: "deployer", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: false, name: "symbol", type: "string" },
    ],
    name: "VaultCreated",
    type: "event",
  },
] as const;

// AtalaVault ABI = ERC-4626 base + Atala-specific functions
export const atalaVaultAbi = [
  ...erc4626Abi,
  // Roles (view)
  { inputs: [], name: "owner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "curator", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "allocator", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "sentinel", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pendingOwner", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
  // State (view)
  { inputs: [], name: "idle", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "vaultCount", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getVaults", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getSupplyQueue", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "getWithdrawQueue", outputs: [{ type: "address[]" }], stateMutability: "view", type: "function" },
  {
    inputs: [{ name: "vault", type: "address" }],
    name: "vaultAllocation",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "vault", type: "address" }],
    name: "vaultConfig",
    outputs: [
      { name: "cap", type: "uint256" },
      { name: "enabled", type: "bool" },
      { name: "index", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Curator functions (write)
  {
    inputs: [
      { name: "vault", type: "address" },
      { name: "cap", type: "uint256" },
    ],
    name: "addVault",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "vault", type: "address" }],
    name: "removeVault",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "vault", type: "address" },
      { name: "newCap", type: "uint256" },
    ],
    name: "setCap",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Allocator functions (write)
  {
    inputs: [
      {
        name: "allocations",
        type: "tuple[]",
        components: [
          { name: "vault", type: "address" },
          { name: "delta", type: "int256" },
        ],
      },
    ],
    name: "reallocate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newQueue", type: "address[]" }],
    name: "setSupplyQueue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newQueue", type: "address[]" }],
    name: "setWithdrawQueue",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Owner functions (write)
  {
    inputs: [{ name: "newCurator", type: "address" }],
    name: "setCurator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newAllocator", type: "address" }],
    name: "setAllocator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "newSentinel", type: "address" }],
    name: "setSentinel",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Sentinel functions (write)
  {
    inputs: [{ name: "vault", type: "address" }],
    name: "emergencyWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Assets available for vault creation
export interface CreationAsset {
  address: `0x${string}`;
  symbol: string;
  name: string;
  decimals: number;
  suggestedVaultName: string;
  suggestedSymbol: string;
}

export const VAULT_CREATION_ASSETS: CreationAsset[] = [
  {
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    suggestedVaultName: "Atala USDC Vault",
    suggestedSymbol: "atUSDC",
  },
  {
    address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    symbol: "WAVAX",
    name: "Wrapped AVAX",
    decimals: 18,
    suggestedVaultName: "Atala WAVAX Vault",
    suggestedSymbol: "atWAVAX",
  },
  {
    address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    symbol: "WETH.e",
    name: "Wrapped Ether",
    decimals: 18,
    suggestedVaultName: "Atala WETH Vault",
    suggestedSymbol: "atWETH",
  },
  {
    address: "0x152b9d0FdC40C096DE345496714100Da74a69Df6",
    symbol: "BTC.b",
    name: "Bitcoin (Bridged)",
    decimals: 8,
    suggestedVaultName: "Atala BTC Vault",
    suggestedSymbol: "atBTC",
  },
  {
    address: "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE",
    symbol: "sAVAX",
    name: "Staked AVAX",
    decimals: 18,
    suggestedVaultName: "Atala sAVAX Vault",
    suggestedSymbol: "atSAVAX",
  },
  {
    address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    suggestedVaultName: "Atala USDT Vault",
    suggestedSymbol: "atUSDT",
  },
];
