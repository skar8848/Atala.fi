# Atala.fi

Unified lending hub on Avalanche C-Chain. Inspired by [MonarchLend](https://www.monarchlend.xyz/), Atala aggregates lending markets from Euler V2 and Silo V2 into a single interface — compare yields, manage positions, and deploy automated vault strategies across protocols.

Morpho Blue is deployed on Avalanche but has no active markets yet. Euler V2 (61 vaults) and Silo V2 (37 isolated markets) are the two live protocols integrated.

**Live:** [atalafinance.vercel.app](https://atalafinance.vercel.app)

## What it does

- **Unified Markets** — Browse all Euler V2 vaults and Silo V2 isolated markets in one table. Filter by protocol, sort by APY, TVL, or utilization.
- **AtalaVault** — Permissionless ERC-4626 aggregator. Deposit one asset, let the curator allocate across multiple Euler V2 vaults for optimized yield.
- **AtalaAgent** — Non-custodial keeper that auto-rebalances vault allocations when APY spreads or idle ratios exceed configurable thresholds.
- **Portfolio** — View your positions across Euler, Silo, and Morpho in one place.
- **Analytics** — TVL breakdown, APY leaderboard, utilization charts.

## Architecture

```
Smart Contracts (Foundry)          Frontend (Next.js 16)
┌─────────────────────┐            ┌──────────────────────────┐
│ AtalaVault (ERC4626) │            │ Markets table (unified)  │
│   └─ EVC batch ops   │            │ Portfolio (cross-proto)  │
│ AtalaFactory         │◄──────────►│ Analytics (Recharts)     │
│ AtalaAgent (keeper)  │  wagmi v3  │ Build (deploy vaults)    │
└─────────────────────┘            └──────────────────────────┘
        │                                    │
        ▼                                    ▼
   Euler V2 (61 vaults)              RainbowKit + wagmi
   Silo V2 (37 markets)             multicall reads (30s)
   Morpho Blue (no markets yet)
```

## Smart Contracts

| Contract | Description |
|---|---|
| `AtalaVault.sol` | ERC-4626 aggregator over Euler V2 vaults. Roles: owner, curator, allocator, sentinel. |
| `AtalaFactory.sol` | Permissionless factory — anyone can deploy a vault for any ERC-20. |
| `AtalaAgent.sol` | Automated rebalancer. Registers as EVC accountOperator, can only move funds between sub-vaults. |

Tests: 40/40 passing (Foundry). 21 vault, 7 factory, 12 agent.

## Tech Stack

**Contracts:** Solidity 0.8.24, Foundry, OpenZeppelin 5.x, EVC

**Frontend:** Next.js 16, React 19, TypeScript, wagmi v3, viem, RainbowKit, shadcn/ui, Tailwind CSS 4, Recharts, TanStack Table + Query

## Getting Started

```bash
# Contracts
forge install
forge test

# Frontend
cd frontend
npm install
npm run dev
```

## Why Avalanche

Euler V2 and Silo V2 both have active deployments on Avalanche C-Chain with real liquidity. Morpho Blue is deployed but has no markets yet. Atala unifies these fragmented lending sources so users don't need to check three different UIs to find the best rates.
