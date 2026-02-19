# CLAUDE.md - Atala Project Context

## What is Atala

**Unified Lending Hub on Avalanche** - A single interface to explore, compare, and interact with lending markets across **Euler V2**, **Morpho Blue**, and **Silo V2** on Avalanche C-Chain.

Morpho Blue is deployed on Avalanche but has zero ecosystem yet. Euler V2 has 61 active vaults managed by 7 curators. Silo V2 has 37 isolated lending markets with ~$16M TVL. Atala bridges all three.

### Value proposition
- **Morpho Blue side**: Be your own curator, create permissionless ungoverned markets with 0 fees (first mover on Avalanche)
- **Euler V2 side**: Access 61 curated vaults with existing liquidity
- **Silo V2 side**: Access 37 isolated lending markets with risk-isolated pairs
- **Cross-protocol**: Compare yields, find best rates, unified portfolio view

---

## Repo Structure

```
atala-dev/
├── CLAUDE.md                          # This file
├── foundry.toml                       # Foundry config (cancun EVM, Avalanche RPC)
├── .env                               # AVALANCHE_RPC_URL
├── remappings.txt                     # OZ, EVK, EVC import paths
│
├── src/                               # Solidity contracts
│   ├── core/AtalaVault.sol            # ERC-4626 aggregator (~440 LOC)
│   ├── core/AtalaFactory.sol          # Permissionless vault deployment
│   ├── agents/AtalaAgent.sol          # Keeper-pattern rebalancer
│   └── interfaces/                    # IEulerVault, IEVC, IEulerEarn
│
├── test/                              # 40/40 tests pass
│   ├── AtalaVault.t.sol               # 21 tests
│   ├── AtalaFactory.t.sol             # 7 tests
│   ├── AtalaAgent.t.sol               # 12 tests
│   └── mocks/                         # ERC20Mock, ERC4626Mock
│
├── script/                            # Foundry scripts
│   ├── helpers/Addresses.sol          # Verified Euler V2 Avalanche addresses
│   ├── 01_Discovery.s.sol
│   ├── 02_DeployAtala.s.sol
│   └── 03_TestFlow.s.sol
│
└── frontend/                          # Next.js 14 app
    ├── package.json                   # wagmi v3, viem, rainbowkit, recharts, tanstack
    ├── .npmrc                         # legacy-peer-deps=true (RainbowKit/wagmi compat)
    ├── components.json                # shadcn (new-york style)
    │
    └── src/
        ├── app/
        │   ├── layout.tsx             # Dark mode, Providers, Header, Toaster
        │   ├── page.tsx               # Redirects to /markets
        │   ├── globals.css            # Tailwind v4 + shadcn theme vars
        │   ├── markets/
        │   │   ├── page.tsx           # Market explorer (protocol tabs, filters, table)
        │   │   └── [address]/page.tsx # Euler vault detail
        │   ├── portfolio/page.tsx     # Wallet positions (supply + borrow)
        │   └── analytics/page.tsx     # Charts (TVL, APY, utilization)
        │
        ├── components/
        │   ├── ui/                    # 15 shadcn components
        │   ├── layout/Header.tsx      # Nav + wallet connect
        │   ├── providers.tsx          # Wagmi + QueryClient + RainbowKit
        │   └── markets/
        │       ├── VaultTable.tsx      # Unified table (Euler + Morpho)
        │       ├── MarketStats.tsx     # Aggregate stats cards
        │       └── MarketFilter.tsx    # Search + asset filter badges
        │
        ├── hooks/
        │   ├── useUnifiedMarkets.ts   # Combines Euler + Morpho + Silo data
        │   ├── useEulerVaults.ts      # Multicall read from 61 EVK vaults
        │   ├── useVaultDiscovery.ts   # Hardcoded 61 vault addresses + curator labels
        │   ├── useMorphoMarkets.ts    # Read Morpho Blue market data
        │   ├── useSiloMarkets.ts      # Read 37 Silo V2 isolated markets via SiloLens
        │   └── usePortfolio.ts        # User positions across protocols
        │
        ├── config/
        │   ├── contracts.ts           # Euler addresses + 30+ token metadata
        │   ├── morpho.ts              # Morpho Blue address + ABI
        │   ├── silo.ts               # Silo V2 addresses + ABIs (SiloFactory, SiloLens, SiloConfig, ISilo)
        │   ├── wagmi.ts               # RainbowKit config (Avalanche)
        │   ├── abis.ts               # EVK vault ABI, ERC20, ERC4626
        │   └── vaults.ts             # Vault discovery config
        │
        └── lib/
            ├── utils.ts               # cn() for shadcn
            └── format.ts              # formatUSD, formatPercent, interestRateToAPY, etc.
```

---

## Key Addresses (Avalanche C-Chain, 43114)

### Euler V2
| Contract | Address |
|----------|---------|
| EVC | `0xddcbe30A761Edd2e19bba930A977475265F36Fa1` |
| EVK Factory | `0xaf4B4c18B17F6a2B32F6c398a3910bdCD7f26181` |
| Euler Earn Factory | `0x574B00f5a0C56D370F19fa887a5545d74F52fAC2` |
| Vault Lens | `0x1521C9DCA248ceE906943096a5B13Fc657A020C3` |

### Morpho Blue
| Contract | Address |
|----------|---------|
| Morpho Blue Core | `0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb` |

### Silo V2
| Contract | Address |
|----------|---------|
| SiloFactory | `0x931e59f06b83dd3d9a622fd4537989b6c63b9bde` |
| SiloLens | `0x228a8688c0d8fd6d4834c33664e5fa775c91d11c` |
| SiloRouter | `0x39f7eed73d48760e19e8408b29da6b3372eee1cf` |

### Euler V2 Curators on Avalanche (61 vaults total)
- **Re7 Labs** (20 vaults) - Governor: `0x3BA1566ED39F865bAf4c1Eb9acE53F3D2062bE65`
- **K3 Capital** (17 vaults) - Governor: `0xdD84A24eeddE63F10Ec3e928f1c8302A47538b6B`
- **Keyring** (8 vaults) - Governor: `0x69cC425B1E5f302e7Db4E5d125ab984EC5186364`
- **MEV Capital** (6 vaults) - Governor: `0xB672Ea44A1EC692A9Baf851dC90a1Ee3DB25F1C4`
- **9Summits** (6 vaults) - Governor: `0x23E6aecB76675462Ad8f2B31eC7C492060c2fAEF`
- **Reservoir Labs** (2 vaults) - Governor: `0xAcE9D0c885f1c241C336B63D36CDe44e34e8B391`
- **Turtle** (2 vaults) - Governor: `0x2631b5260715ec9F1211EF0Fb10c702922038B63`

---

## Tech Stack

### Smart Contracts (done, 40/40 tests pass)
- Solidity 0.8.24, Foundry, cancun EVM
- OpenZeppelin 5.x (SafeERC20, ERC4626, Ownable2Step, ReentrancyGuard)
- forge-std v1.15

### Frontend (in progress)
- Next.js 14 (App Router), TypeScript, Tailwind CSS v4
- shadcn/ui (new-york, 15 components)
- wagmi v3 + viem + RainbowKit (Avalanche chain)
- Recharts + TanStack Table + TanStack Query
- Dark mode by default

---

## Data Flow

- **Euler V2**: 61 vault addresses hardcoded from euler-labels repo, data via wagmi multicall
- **Silo V2**: 37 SiloConfig addresses hardcoded, 2-step multicall (getSilos → SiloLens reads)
- **Morpho Blue**: Contract deployed, 0 markets exist yet - empty state with "Create Market" CTA
- **Market data**: Live from chain via wagmi `useReadContracts` multicall
- **Refresh**: Every 30s (staleTime)
- **Price estimates**: Hardcoded USD approximations for TVL display (no oracle integration yet)

---

## What's Done

- [x] AtalaVault.sol - ERC-4626 aggregator with roles (owner/curator/allocator/sentinel)
- [x] AtalaFactory.sol - Permissionless vault creation
- [x] AtalaAgent.sol - Keeper rebalancer
- [x] All tests passing (40/40)
- [x] Frontend scaffolding with Next.js 14
- [x] Markets page with protocol tabs (Euler V2 / Morpho Blue / Silo V2 / All)
- [x] 61 Euler V2 vaults displaying with live on-chain data
- [x] 37 Silo V2 isolated markets displaying with live on-chain data (via SiloLens)
- [x] Vault detail page (Euler)
- [x] Portfolio page (wallet positions)
- [x] Analytics page (charts: TVL by asset, TVL by protocol, APY leaderboard, utilization)
- [x] Pushed to GitHub: https://github.com/skar8848/Atala.fi

## What's Next

### Phase 1: UI Polish
- [ ] Token logos (Trust Wallet CDN or custom SVGs)
- [ ] Curator labels on vault cards
- [ ] Responsive mobile layout
- [ ] Loading skeletons instead of spinners

### Phase 2: Morpho Blue Integration (killer feature)
- [ ] Create Market form (collateral, loan token, oracle, LLTV, IRM)
- [ ] Discover existing Morpho markets from createMarket events
- [ ] Supply/Withdraw on Morpho Blue markets
- [ ] Morpho market detail page

### Phase 3: Actions
- [ ] Supply/Withdraw on Euler V2 vaults
- [ ] Borrow/Repay flows
- [ ] EVC batch transactions
- [ ] Approval management (token approvals)

### Phase 4: Atala Vaults
- [ ] Deploy AtalaVault from UI (uses AtalaFactory)
- [ ] Configure sub-vaults and caps
- [ ] Rebalance dashboard
- [ ] Keeper automation setup

---

## Environment Notes

- Windows 11, bash may not work in Claude Code VSCode extension (use Write/Edit tools)
- Foundry installed at `~/.foundry/bin/` (v1.6.0)
- Node.js with npm, `.npmrc` has `legacy-peer-deps=true`
- GitHub remote: https://github.com/skar8848/Atala.fi

## Commands

```bash
# Smart contracts
forge build && forge test

# Frontend
cd frontend && npm run dev

# Push
git add . && git commit -m "message" && git push origin main
```
