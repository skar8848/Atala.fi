import Link from "next/link";

export default function VaultsPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Atala Vaults</h1>
        <p className="text-muted-foreground text-lg">
          Deploy permissionless ERC-4626 aggregator vaults with role-based governance and automated rebalancing.
        </p>
      </div>

      {/* Overview */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Overview</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            Atala Vaults are <span className="text-atala">ERC-4626</span> compliant aggregator vaults that
            allocate deposits across multiple Euler V2 sub-vaults. Instead of manually moving funds between
            markets, you deploy a vault that does it for you — under parameters you define.
          </p>
          <p>
            Anyone can deploy a vault through the <span className="text-foreground font-medium">AtalaFactory</span> contract.
            No governance approval needed, no whitelist, no fees. Your vault, your strategy, your rules.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">How it works</h2>
        <div className="space-y-3">
          {[
            {
              step: "1",
              title: "Deploy",
              description:
                "Use the Build page to deploy a new AtalaVault via the factory. Choose the underlying asset (e.g. USDC, WAVAX) and set a name and symbol for your vault token.",
            },
            {
              step: "2",
              title: "Configure",
              description:
                "Add Euler V2 sub-vaults to your allocation. Set supply caps for each sub-vault and define the supply and withdraw queue order.",
            },
            {
              step: "3",
              title: "Assign Roles",
              description:
                "Grant roles to addresses that will help manage the vault: curators set parameters, allocators can rebalance, and sentinels can emergency-pause.",
            },
            {
              step: "4",
              title: "Rebalance",
              description:
                "Move funds between sub-vaults to optimize yield. This can be done manually or via an AtalaAgent that automates the process.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-4 rounded-xl border border-border/40 bg-card/30 p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-atala/10 text-atala text-sm font-bold">
                {item.step}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vault Roles */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Vault Roles</h2>
        <p className="text-[15px] text-muted-foreground leading-relaxed">
          Atala Vaults use a role-based access control system. Each role has specific permissions:
        </p>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-atala" />
              <h3 className="font-semibold text-foreground">Owner</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Full control over the vault. Can add/remove sub-vaults, set caps, assign all other roles,
              and transfer ownership. Uses OpenZeppelin&apos;s two-step transfer pattern for safety.
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <h3 className="font-semibold text-foreground">Curator</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manages vault parameters. Can update sub-vault caps, modify the supply and withdraw queues,
              and adjust allocation boundaries. Cannot add new sub-vaults or change roles.
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <h3 className="font-semibold text-foreground">Allocator</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Can rebalance funds between sub-vaults within the caps set by the curator.
              This role is designed for automated agents (like AtalaAgent) that optimize allocation
              without needing full vault control.
            </p>
          </div>

          <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              <h3 className="font-semibold text-foreground">Sentinel</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Emergency role. Can remove sub-vaults and reduce caps to protect depositors in case
              of a security incident. Cannot increase exposure — only decrease it.
            </p>
          </div>
        </div>
      </section>

      {/* AtalaAgent */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Rebalancing Agent</h2>
        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            The <span className="text-atala">AtalaAgent</span> is a keeper-pattern contract that automates
            rebalancing for your vault. It registers as an EVC account operator on your vault and can move
            funds between sub-vaults based on yield optimization logic.
          </p>

          <div className="rounded-xl border border-atala/20 bg-atala/5 p-5 space-y-2">
            <h3 className="font-medium text-foreground">How it works</h3>
            <ol className="list-decimal list-inside space-y-1.5 text-sm">
              <li>The vault owner deploys an AtalaAgent and grants it the <span className="text-amber-400">Allocator</span> role.</li>
              <li>The agent registers as an EVC operator for the vault address.</li>
              <li>Anyone can call <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">rebalance()</code> on the agent with a list of allocation targets.</li>
              <li>The agent withdraws from over-allocated sub-vaults and deposits into under-allocated ones, respecting the caps.</li>
            </ol>
          </div>

          <p>
            The agent is trustless — it can only rebalance within the boundaries set by the curator.
            It cannot withdraw funds from the vault itself or change any configuration.
          </p>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Link href="/docs/why-atala" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Why Atala
        </Link>
        <Link href="/docs/contracts" className="text-sm text-atala hover:text-atala transition-colors">
          Smart Contracts &rarr;
        </Link>
      </div>
    </div>
  );
}
