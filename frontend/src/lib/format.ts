export function formatUSD(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatTokenAmount(value: bigint, decimals: number, displayDecimals = 2): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const remainder = value % divisor;
  const remainderStr = remainder.toString().padStart(decimals, "0").slice(0, displayDecimals);
  return `${whole.toLocaleString()}.${remainderStr}`;
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

// Convert Euler V2 interest rate (per-second rate * 1e27) to APY
export function interestRateToAPY(ratePerSecond: bigint): number {
  const SECONDS_PER_YEAR = 365.25 * 24 * 3600;
  const rate = Number(ratePerSecond) / 1e27;
  const apy = (Math.pow(1 + rate, SECONDS_PER_YEAR) - 1) * 100;
  return apy;
}

// Calculate utilization rate
export function calcUtilization(totalBorrows: bigint, totalAssets: bigint): number {
  if (totalAssets === 0n) return 0;
  return Number((totalBorrows * 10000n) / totalAssets) / 100;
}

// Parse a human-readable token amount to raw bigint (e.g., "1000" with 6 decimals → 1000000000n)
export function parseTokenAmount(input: string, decimals: number): bigint {
  const clean = input.replace(/,/g, "").trim();
  if (!clean || isNaN(Number(clean))) return 0n;
  const [whole = "0", frac = ""] = clean.split(".");
  const paddedFrac = frac.slice(0, decimals).padEnd(decimals, "0");
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFrac);
}

// Format idle ratio as percentage
export function formatIdleRatio(idle: bigint, totalAssets: bigint): string {
  if (totalAssets === 0n) return "0.00%";
  const ratio = Number((idle * 10000n) / totalAssets) / 100;
  return `${ratio.toFixed(2)}%`;
}
