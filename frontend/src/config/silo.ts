// Silo V2 on Avalanche C-Chain (43114)
// Isolated lending markets - each market = 2 ERC-4626 vaults paired via SiloConfig

export const SILO_ADDRESSES = {
  SILO_FACTORY: "0x931e59f06b83dd3d9a622fd4537989b6c63b9bde" as const,
  SILO_LENS: "0x228a8688c0d8fd6d4834c33664e5fa775c91d11c" as const,
  SILO_ROUTER: "0x39f7eed73d48760e19e8408b29da6b3372eee1cf" as const,
} as const;

// All 37 SiloConfig addresses on Avalanche (each represents an isolated market pair)
export const SILO_MARKET_CONFIGS: `0x${string}`[] = [
  "0x9ddaAd42c1a6DEFa4185f614239A1e6F89eA1528", // AUSD / USDC
  "0x8b84c6C770Dd9856B5830C5A2DB1893d08f9BF0f", // BTC.b / WAVAX
  "0xF806aF0CC54197E7850a33f8101916752fE72f55", // WAVAX / USDC
  "0x1EbEca6f9A57d0B0E777710790de3F70dbeCCE26", // sAVAX / WAVAX
  "0x4592c27A4A3FEec2123953369684b1F61309ac08", // sAVAX / WAVAX (v2)
  "0xf6F23b56E327f9537621046C1a365A51ED2a0d30", // ggAVAX / WAVAX
  "0x47c0f2680622033c56c63bdec59ac9C140Ff6424", // sUSDe / USDC
  "0x4B56F4Be99FA320557860844d19aF68B636dE3CE", // savUSD / USDC
  "0x7107946bd740193Ab5bed3857195Eaed65d8213F", // savUSD / USDC (v2)
  "0x33fAdB3dB0A1687Cdd4a55AB0afa94c8102856A1", // savUSD / USDC (v3)
  "0xC88639126aF3a05bBefB87cCEEc790dDf5928C55", // savUSD / USDC (v4)
  "0x9255530E5485D9cb261094Ce6Fae33207f2354c3", // savUSD / AUSD
  "0xe714dA3F019E119B3378c02677e8470212A06f1E", // savUSD / USDT
  "0xCf2A7db4FEAd6B38dcdA7c3da665EedF98973716", // deUSD / USDC
  "0x739012d6C63775Ef51be0dBEcaa0C2826fCb20A2", // sdeUSD / USDC
  "0x6B13d486027c1B645ad663Ba9f9A28744D04B8f8", // xUSD / USDC
  "0x1496796aB5a3Ce7192B7cc2f852cBaf2927045ce", // xUSD / USDT
  "0x76A2c55B5aa5037A374d509651b51BA134a3E186", // xUSD / AUSD
  "0x9A214a80971823F85cb4C7f95728215f4cE74693", // xBTC / BTC.b
  "0x6137dC2e437747e51dD786a9F350063C6189CDeb", // savBTC / BTC.b
  "0xcEA9d900C7FD545a044Fab1b74654C8847a624A8", // savBTC / BTC.b (v2)
  "0xCcEB4356F5958e0E7a69Dd5c7A8B2aB730951819", // reUSD / USDC
  "0x8d6639c285AA26D5181E8726ca43555ad8a04133", // yUSD / USDC
  "0x3791C57cE8c8a0A81A8A87F9e3Eb10480A284aF3", // yUTY / USDC
  "0x4AC1591a1c92bCbcE6B9ad8310067BdD0a16e76c", // yUTY / USDT
  "0xb421c716E4CD81105b5A8C36030f11e230835C77", // tAVAX / WAVAX
  "0x9407458B4b5F8f241535b53802bed23A097e5DfB", // XAUt0 / USDT
  "0xDb5620543F469653254696C104Fb891e0D5dB661", // sACRED / USDC
  "0xD0d4eBf4901cBc338619bF4DEA460aBBa6177Bfe", // sBUIDL / USDC
  "0xc079861Ab30C287d270bdE5632c6e09D1C497beC", // sUSDp / USDC
  "0xcd0d510eec4792a944E8dbe5da54DDD6777f02Ca", // sUSDp / USDC (v2)
  "0xdF649DE43291e1EBf09d3B80f28DCC249c503184", // sYUSD / USDC
  "0x674f210036E1AC458571C3497D7DA7F460b71853", // PT_Ethena_USDe_25SEP2025 / USDC
  "0x25430e01A2A3ADa1d40B90D25FECE971FEa9d765", // PT_Ethena_USDe_27Nov2025 / USDC
  "0x99fF0b0466826335ae0e26E715a11Ca73B384D81", // PT_sw_esdeUSD / USDC
  "0x0c4cA628cd0e8D66B0a72D0685EaEBb364EFBe5B", // PT-savUSD / USDC
  "0x06553f52c3b66675dF76ED69ae403090360D2bc0", // PT-sw-avUSDx / USDC
];

// --- ABIs ---

// ISiloConfig - get silo pair addresses and asset info
export const siloConfigAbi = [
  {
    inputs: [],
    name: "getSilos",
    outputs: [
      { name: "silo0", type: "address" },
      { name: "silo1", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getAssetForSilo",
    outputs: [{ name: "asset", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getConfig",
    outputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "daoFee", type: "uint256" },
          { name: "deployerFee", type: "uint256" },
          { name: "silo", type: "address" },
          { name: "token", type: "address" },
          { name: "protectedShareToken", type: "address" },
          { name: "collateralShareToken", type: "address" },
          { name: "debtShareToken", type: "address" },
          { name: "solvencyOracle", type: "address" },
          { name: "maxLtvOracle", type: "address" },
          { name: "interestRateModel", type: "address" },
          { name: "maxLtv", type: "uint256" },
          { name: "lt", type: "uint256" },
          { name: "liquidationTargetLtv", type: "uint256" },
          { name: "liquidationFee", type: "uint256" },
          { name: "flashloanFee", type: "uint256" },
          { name: "hookReceiver", type: "address" },
          { name: "callBeforeQuote", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ISilo - direct reads on each silo vault (ERC-4626 compatible)
export const siloAbi = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "maxRepay",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "asset",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getCollateralAssets",
    outputs: [{ name: "totalCollateralAssets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getDebtAssets",
    outputs: [{ name: "totalDebtAssets", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getLiquidity",
    outputs: [{ name: "liquidity", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "config",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// SiloLens - helper reads (preferred for integrations)
export const siloLensAbi = [
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getUtilization",
    outputs: [{ name: "utilization", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getBorrowAPR",
    outputs: [{ name: "borrowAPR", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getDepositAPR",
    outputs: [{ name: "depositAPR", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "totalDepositsWithInterest",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "totalBorrowAmountWithInterest",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "liquidity",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getMaxLtv",
    outputs: [{ name: "maxLtv", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "_silo", type: "address" }],
    name: "getLt",
    outputs: [{ name: "lt", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
