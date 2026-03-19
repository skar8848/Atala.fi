import Link from "next/link";

export default function ProtocolsPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Protocols</h1>
        <p className="text-muted-foreground text-lg">
          Atala aggregates lending markets from two major protocols on Avalanche C-Chain.
        </p>
      </div>

      {/* Euler V2 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <span className="text-sm font-bold text-cyan-400">E</span>
          </div>
          <h2 className="text-2xl font-semibold">Euler V2</h2>
        </div>

        <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Euler V2</span> is a modular lending protocol built on two core primitives:
            the <span className="text-cyan-400">Ethereum Vault Connector (EVC)</span> and the
            <span className="text-cyan-400"> Euler Vault Kit (EVK)</span>.
          </p>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <h3 className="text-foreground font-medium">EVC — Ethereum Vault Connector</h3>
            <p>
              A foundational layer that enables vaults to interact with each other. It handles authentication,
              operator management, and multi-vault batch calls. Any ERC-4626 vault can plug into the EVC
              to accept collateral from other vaults.
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <h3 className="text-foreground font-medium">EVK — Euler Vault Kit</h3>
            <p>
              A toolkit for deploying custom lending vaults with configurable parameters: interest rate models,
              oracle sources, liquidation incentives, and collateral factors. Each vault is an independent,
              isolated lending market.
            </p>
          </div>

          <p>
            On Avalanche, Euler V2 has <span className="text-foreground font-medium">61 active vaults</span> managed
            by 7 professional risk curators:
          </p>

          <div className="overflow-hidden rounded-xl border border-border/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-card/50">
                  <th className="px-4 py-2.5 text-left font-medium text-foreground">Curator</th>
                  <th className="px-4 py-2.5 text-right font-medium text-foreground">Vaults</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                {[
                  ["Re7 Labs", "20"],
                  ["K3 Capital", "17"],
                  ["Keyring", "8"],
                  ["MEV Capital", "6"],
                  ["9Summits", "6"],
                  ["Reservoir Labs", "2"],
                  ["Turtle", "2"],
                ].map(([curator, count]) => (
                  <tr key={curator} className="border-b border-border/20 last:border-0">
                    <td className="px-4 py-2">{curator}</td>
                    <td className="px-4 py-2 text-right font-mono">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            Atala reads data directly from each vault contract via multicall — no intermediary API.
            Supply APY, borrow APY, utilization, caps, and collateral configuration are all sourced live from on-chain.
          </p>
        </div>
      </section>

      {/* Silo V2 */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
            <span className="text-sm font-bold text-orange-400">S</span>
          </div>
          <h2 className="text-2xl font-semibold">Silo V2</h2>
        </div>

        <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Silo V2</span> is an isolated lending protocol where
            each market is a self-contained pair. Risk from one market cannot cascade into another —
            if a collateral asset is exploited, only that specific silo is affected.
          </p>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <h3 className="text-foreground font-medium">Isolation Model</h3>
            <p>
              Unlike shared-pool protocols, Silo creates isolated two-asset markets (called silos).
              Each silo has its own liquidity pool, interest rates, and risk parameters. This means
              any token can be listed without putting the entire protocol at risk.
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3">
            <h3 className="text-foreground font-medium">Two-Sided Markets</h3>
            <p>
              Each SiloConfig deploys two silos (silo0 and silo1), one for each asset in the pair.
              Users can supply or borrow on either side. Atala reads both sides via the SiloLens contract
              to display deposits, borrows, APR, and utilization for each.
            </p>
          </div>

          <p>
            On Avalanche, Silo V2 has <span className="text-foreground font-medium">37 isolated markets</span>.
            Atala discovers them through hardcoded SiloConfig addresses and queries the SiloLens contract
            for real-time market data.
          </p>
        </div>
      </section>

      {/* How Atala unifies them */}
      <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-6 space-y-3">
        <h3 className="text-lg font-semibold text-foreground">How Atala unifies them</h3>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          Both protocols use different architectures, ABIs, and data models. Atala normalizes everything
          into a <span className="text-cyan-400">UnifiedMarket</span> type — a common schema for asset,
          supply APY, borrow APY, TVL, utilization, and protocol source. This lets you compare markets
          across Euler V2 and Silo V2 in a single table, sort by yield, and find the best rates instantly.
        </p>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Overview
        </Link>
        <Link href="/docs/why-atala" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          Why Atala &rarr;
        </Link>
      </div>
    </div>
  );
}
