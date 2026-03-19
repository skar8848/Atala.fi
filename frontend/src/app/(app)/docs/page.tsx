import Link from "next/link";

const CARDS = [
  {
    href: "/docs/protocols",
    title: "Protocols",
    description: "Understand Euler V2 and Silo V2, the lending protocols aggregated by Atala on Avalanche.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: "/docs/why-atala",
    title: "Why Atala",
    description: "The value proposition: unified lending, permissionless vaults, zero platform fees.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
    ),
  },
  {
    href: "/docs/vaults",
    title: "Atala Vaults",
    description: "Deploy your own ERC-4626 aggregator vault with role-based governance and automated rebalancing.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    href: "/docs/contracts",
    title: "Smart Contracts",
    description: "Technical reference for AtalaVault, AtalaFactory, and AtalaAgent contracts.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
  },
];

export default function DocsOverview() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Documentation</h1>
      <p className="text-muted-foreground text-lg mb-10">
        Everything you need to understand and use Atala — the unified lending hub on Avalanche.
      </p>

      {/* What is Atala */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">What is Atala?</h2>
        <div className="rounded-xl border border-border/40 bg-card/50 p-6 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            <span className="text-foreground font-medium">Atala</span> is a unified interface for DeFi lending on Avalanche C-Chain.
            It aggregates lending markets from <span className="text-cyan-400">Euler V2</span> (61 vaults)
            and <span className="text-cyan-400">Silo V2</span> (37 isolated markets) into a single dashboard.
          </p>
          <p>
            Browse, compare, and interact with all lending markets in one place. Track your portfolio across
            protocols, analyze yields, and deploy your own automated vaults — all without middlemen or platform fees.
          </p>
        </div>
      </section>

      {/* Navigation cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Explore the docs</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-xl border border-border/40 bg-card/30 p-5 transition-all hover:border-cyan-500/30 hover:bg-card/60"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 transition-colors group-hover:bg-cyan-500/20">
                  {card.icon}
                </div>
                <h3 className="font-semibold text-foreground">{card.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <section className="mt-12 rounded-xl border border-border/40 bg-card/30 p-6">
        <h3 className="font-semibold mb-3">Quick links</h3>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href="https://github.com/skar8848/Atala.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <a
            href="/markets"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/40 px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            Launch App
          </a>
        </div>
      </section>
    </div>
  );
}
