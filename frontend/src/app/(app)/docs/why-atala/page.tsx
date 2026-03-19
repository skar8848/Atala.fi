import Link from "next/link";

export default function WhyAtalaPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Why Atala</h1>
        <p className="text-muted-foreground text-lg">
          A lending experience designed for power users who want full control.
        </p>
      </div>

      {/* Problem */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">The Problem</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            DeFi lending on Avalanche is fragmented. Euler V2 vaults and Silo V2 markets each have
            their own interfaces, data formats, and workflows. To find the best yield, you need to
            check multiple dashboards, compare rates manually, and manage positions across different UIs.
          </p>
          <p>
            Managed vault solutions exist but come with trade-offs: management fees that eat into your yield,
            opaque allocation strategies, and incentive misalignment between vault managers and depositors.
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">What Atala offers</h2>

        <div className="grid gap-4">
          {[
            {
              title: "Unified Market Discovery",
              description:
                "Browse 61 Euler V2 vaults and 37 Silo V2 markets in a single, filterable table. Sort by supply APY, TVL, utilization, or asset. Compare rates across protocols instantly.",
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              ),
            },
            {
              title: "Full Transparency",
              description:
                "All data is read directly from on-chain contracts via multicall. No intermediary APIs, no stale data. What you see is what the blockchain says, refreshed every 30 seconds.",
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ),
            },
            {
              title: "Cross-Protocol Portfolio",
              description:
                "Track all your supply and borrow positions across Euler V2 in one view. See your total exposure, weighted APY, and health factors without switching between apps.",
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              ),
            },
            {
              title: "Analytics Dashboard",
              description:
                "Visualize the lending landscape: TVL breakdown by asset and protocol, APY leaderboards, utilization distribution. Make informed decisions backed by data.",
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M18 20V10M12 20V4M6 20v-6" />
                </svg>
              ),
            },
            {
              title: "Zero Platform Fees",
              description:
                "Atala is a frontend — it doesn't sit between you and the protocols. No wrapping, no intermediary contracts on existing markets, no fees skimmed from your yield.",
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              ),
            },
            {
              title: "Permissionless Vaults",
              description:
                "Deploy your own ERC-4626 aggregator vault with no gatekeepers. Define your own allocation strategy, set roles, and automate rebalancing — your vault, your rules.",
              icon: (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              ),
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex gap-4 rounded-xl border border-border/40 bg-card/30 p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                {item.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Target users */}
      <section className="rounded-xl border border-border/40 bg-card/50 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Built for</h3>
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="space-y-1">
            <p className="font-medium text-foreground">Yield Seekers</p>
            <p className="text-muted-foreground">
              Compare rates across 98 markets instantly and allocate where yields are highest.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">Risk Curators</p>
            <p className="text-muted-foreground">
              Deploy and manage automated vaults with fine-grained role-based access control.
            </p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">DeFi Power Users</p>
            <p className="text-muted-foreground">
              One dashboard for the entire Avalanche lending ecosystem. No more tab switching.
            </p>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Link href="/docs/protocols" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Protocols
        </Link>
        <Link href="/docs/vaults" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          Atala Vaults &rarr;
        </Link>
      </div>
    </div>
  );
}
