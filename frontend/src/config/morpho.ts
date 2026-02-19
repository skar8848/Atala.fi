// Morpho Blue on Avalanche C-Chain (43114)
// Deployed via "Morpho Everywhere" (late 2024)

export const MORPHO_ADDRESSES = {
  MORPHO_BLUE: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb" as const,
} as const;

// Morpho Blue ABI - core functions for reading market data
export const morphoBlueAbi = [
  // Market info
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "market",
    outputs: [
      { name: "totalSupplyAssets", type: "uint128" },
      { name: "totalSupplyShares", type: "uint128" },
      { name: "totalBorrowAssets", type: "uint128" },
      { name: "totalBorrowShares", type: "uint128" },
      { name: "lastUpdate", type: "uint128" },
      { name: "fee", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Market params
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "idToMarketParams",
    outputs: [
      { name: "loanToken", type: "address" },
      { name: "collateralToken", type: "address" },
      { name: "oracle", type: "address" },
      { name: "irm", type: "address" },
      { name: "lltv", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // User position
  {
    inputs: [
      { name: "id", type: "bytes32" },
      { name: "user", type: "address" },
    ],
    name: "position",
    outputs: [
      { name: "supplyShares", type: "uint256" },
      { name: "borrowShares", type: "uint128" },
      { name: "collateral", type: "uint128" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // Supply
  {
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
      { name: "assets", type: "uint256" },
      { name: "shares", type: "uint256" },
      { name: "onBehalf", type: "address" },
      { name: "data", type: "bytes" },
    ],
    name: "supply",
    outputs: [
      { name: "assetsSupplied", type: "uint256" },
      { name: "sharesSupplied", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Create market
  {
    inputs: [
      {
        name: "marketParams",
        type: "tuple",
        components: [
          { name: "loanToken", type: "address" },
          { name: "collateralToken", type: "address" },
          { name: "oracle", type: "address" },
          { name: "irm", type: "address" },
          { name: "lltv", type: "uint256" },
        ],
      },
    ],
    name: "createMarket",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // Check if market exists
  {
    inputs: [{ name: "id", type: "bytes32" }],
    name: "isMarketCreated",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
