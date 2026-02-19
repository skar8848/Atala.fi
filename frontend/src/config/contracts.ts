// Euler V2 verified addresses on Avalanche C-Chain (43114)
export const EULER_ADDRESSES = {
  EVC: "0xddcbe30A761Edd2e19bba930A977475265F36Fa1" as const,
  EVK_FACTORY: "0xaf4B4c18B17F6a2B32F6c398a3910bdCD7f26181" as const,
  EULER_EARN_FACTORY: "0x574B00f5a0C56D370F19fa887a5545d74F52fAC2" as const,
  VAULT_LENS: "0x1521C9DCA248ceE906943096a5B13Fc657A020C3" as const,
  ORACLE_ROUTER: "0x1943CeDE57adD0A35f43a95ff2Cb5b5e0e94e1C8" as const,
  SWAP_VERIFIER: "0x2547b8E25c839E5B9037C224bb4F638750ca0418" as const,
} as const;

// Token metadata for known assets on Avalanche
export const TOKENS: Record<string, TokenMeta> = {
  WAVAX: {
    address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    symbol: "WAVAX",
    name: "Wrapped AVAX",
    decimals: 18,
  },
  USDC: {
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  USDT: {
    address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  WETH: {
    address: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    symbol: "WETH.e",
    name: "Wrapped Ether",
    decimals: 18,
  },
  BTCb: {
    address: "0x152b9d0FdC40C096DE345496714100Da74a69Df6",
    symbol: "BTC.b",
    name: "Bitcoin (Bridged)",
    decimals: 8,
  },
  WBTC: {
    address: "0x50b7545627a5162F82A992c33b87aDc75187B218",
    symbol: "WBTC.e",
    name: "Wrapped BTC",
    decimals: 8,
  },
  SAVAX: {
    address: "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE",
    symbol: "sAVAX",
    name: "Staked AVAX",
    decimals: 18,
  },
  GGAVAX: {
    address: "0xA25EaF2906FA1a3a13EdAc9B9657108Af7B703e3",
    symbol: "ggAVAX",
    name: "GoGoPool AVAX",
    decimals: 18,
  },
  AUSD: {
    address: "0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a",
    symbol: "AUSD",
    name: "Agora USD",
    decimals: 6,
  },
  AVUSD: {
    address: "0xDBf9F8c8D4BaED63F0bF3C3642c61BaD05ca3B89",
    symbol: "avUSD",
    name: "Avalon USD",
    decimals: 18,
  },
  SAVUSD: {
    address: "0x06D47F3fb376649b5B8Ddc6016c1A3E7a9e9D5e2",
    symbol: "savUSD",
    name: "Staked avUSD",
    decimals: 18,
  },
  DEUSD: {
    address: "0x0686c755223b6E3D8070a01a0B393A54bB7f1811",
    symbol: "deUSD",
    name: "Elixir deUSD",
    decimals: 18,
  },
  SDEUSD: {
    address: "0x5C6b2C4C78A30A8f2c05E0eCa2de152E6F67650A",
    symbol: "sdeUSD",
    name: "Staked deUSD",
    decimals: 18,
  },
  SUSDE: {
    address: "0xfc211ee5FDEc8fDA3b534dDE1a3e84F6B1e2c90a",
    symbol: "sUSDe",
    name: "Staked USDe",
    decimals: 18,
  },
  SOLVBTC: {
    address: "0x0bB5A4e8E143CCcA6462b0E918f052c36A41b3CC",
    symbol: "SolvBTC",
    name: "Solv BTC",
    decimals: 18,
  },
  SOLVBTCBBN: {
    address: "0xF3B001D64C656e30a62fbaacC003B68810B14E44",
    symbol: "SolvBTC.BBN",
    name: "Solv BTC BBN",
    decimals: 18,
  },
  EURC: {
    address: "0xC891EB4cbdEFf6e073e1887A517984bdc0fea05F",
    symbol: "EURC",
    name: "Euro Coin",
    decimals: 6,
  },
  // Silo-specific tokens (may have different addresses than Euler versions)
  USDE: {
    address: "0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34",
    symbol: "USDe",
    name: "Ethena USDe",
    decimals: 18,
  },
  XUSD: {
    address: "0x94f9bB5c972285728DCee7EAece48BeC2fF341ce",
    symbol: "xUSD",
    name: "Exaion USD",
    decimals: 18,
  },
  XBTC: {
    address: "0x6eAf19b2FC24552925dB245F9Ff613157a7dbb4C",
    symbol: "xBTC",
    name: "Exaion BTC",
    decimals: 18,
  },
  SAVBTC: {
    address: "0x649342c6bff544d82DF1B2bA3C93e0C22cDeBa84",
    symbol: "savBTC",
    name: "Staked avBTC",
    decimals: 18,
  },
  REUSD: {
    address: "0x180aF87b47Bf272B2df59dccf2D76a6eaFa625Bf",
    symbol: "reUSD",
    name: "Reserve USD",
    decimals: 18,
  },
  YUSD: {
    address: "0x4772D2e014F9fC3a820C444e3313968e9a5C8121",
    symbol: "yUSD",
    name: "Yield USD",
    decimals: 18,
  },
  YUTY: {
    address: "0x580d5E1399157FD0d58218b7A514b60974F2AB01",
    symbol: "yUTY",
    name: "Yield UTY",
    decimals: 18,
  },
  TAVAX: {
    address: "0x14A84F1a61cCd7D1BE596A6cc11FE33A36Bc1646",
    symbol: "tAVAX",
    name: "Tortuga AVAX",
    decimals: 18,
  },
  XAUT: {
    address: "0x2775d5105276781B4b85bA6eA6a6653bEeD1dd32",
    symbol: "XAUt",
    name: "Tether Gold",
    decimals: 6,
  },
  SACRED: {
    address: "0xB5236646Ae76590056C024f32113655a8A981168",
    symbol: "sACRED",
    name: "Staked ACRED",
    decimals: 18,
  },
  SBUIDL: {
    address: "0xaEb1FA0853c7C98EAb10fcF0EA669aE3d07FBB10",
    symbol: "sBUIDL",
    name: "Staked BUIDL",
    decimals: 18,
  },
  SUSDP: {
    address: "0x9D92c21205383651610f90722131655A5B8ED3E0",
    symbol: "sUSDp",
    name: "Staked USDp",
    decimals: 18,
  },
  SYUSD: {
    address: "0x539e46827c37A3ef11c7cE521CC56B4d59E602e3",
    symbol: "sYUSD",
    name: "Staked yUSD",
    decimals: 18,
  },
  // Euler-specific tokens (not on Silo)
  WEETH: {
    address: "0xa3d68b74bf0528fdd07263c60d6488749044914b",
    symbol: "weETH",
    name: "Wrapped eETH",
    decimals: 18,
  },
  UTY: {
    address: "0xdbc5192a6b6ffee7451301bb4ec312f844f02b4a",
    symbol: "UTY",
    name: "Unity (XSY)",
    decimals: 18,
  },
  UPAUSD: {
    address: "0x3408b22d8895753c9a3e14e4222e981d4e9a599e",
    symbol: "upAUSD",
    name: "Upshift AUSD",
    decimals: 6,
  },
  UPAVAX: {
    address: "0xb2bfb52cfc40584ac4e9e2b36a5b8d6554a56e0b",
    symbol: "upAVAX",
    name: "Upshift AVAX",
    decimals: 18,
  },
  PTUSDE: {
    address: "0x9da7f8c0d6e3f247affdf92c3dddd83c1e248e14",
    symbol: "PT-USDe",
    name: "Pendle PT USDe",
    decimals: 18,
  },
  WRSETH: {
    address: "0x7bfd4ca2a6cf3a3fddd645d10b323031afe47ff0",
    symbol: "wrsETH",
    name: "Wrapped rsETH",
    decimals: 18,
  },
  EUROP: {
    address: "0x8835a2f66a7aaccb297cb985831a616b75e2e16c",
    symbol: "EUROP",
    name: "EUROP Stablecoin",
    decimals: 6,
  },
  XUSDC: {
    address: "0xcf0eb4ac018c06a16ed5c63484823c7805e7599d",
    symbol: "xUSDC",
    name: "Multipli xUSDC",
    decimals: 6,
  },
  XBTCB: {
    address: "0x468bbabaef852c134b584382c0fef83f2954cd5c",
    symbol: "xBTC.b",
    name: "Multipli xBTC.b",
    decimals: 8,
  },
  // Silo-version addresses (different from Euler versions of same tokens)
  SILO_DEUSD: {
    address: "0xB57B25851fE2311CC3fE511c8F10E868932e0680",
    symbol: "deUSD",
    name: "Elixir deUSD",
    decimals: 18,
  },
  SILO_SDEUSD: {
    address: "0x68088C91446c7bEa49ea7Dbd3B96Ce62B272DC96",
    symbol: "sdeUSD",
    name: "Staked deUSD",
    decimals: 18,
  },
  SILO_SUSDE: {
    address: "0x211cc4dd073734da055fbf44a2b4667d5e5fe5d2",
    symbol: "sUSDe",
    name: "Staked USDe",
    decimals: 18,
  },
  SILO_SAVUSD: {
    address: "0x06d47F3fb376649c3A9Dafe069B3D6E35572219E",
    symbol: "savUSD",
    name: "Staked avUSD",
    decimals: 18,
  },
};

export interface TokenMeta {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
}

const TOKEN_BY_ADDRESS: Record<string, TokenMeta> = Object.fromEntries(
  Object.values(TOKENS).map((t) => [t.address.toLowerCase(), t])
);

export function getTokenByAddress(address: string): TokenMeta | undefined {
  return TOKEN_BY_ADDRESS[address.toLowerCase()];
}
