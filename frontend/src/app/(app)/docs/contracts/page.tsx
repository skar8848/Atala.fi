import Link from "next/link";

export default function ContractsPage() {
  return (
    <div className="max-w-3xl space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Smart Contracts</h1>
        <p className="text-muted-foreground text-lg">
          Technical reference for Atala&apos;s on-chain contracts.
        </p>
      </div>

      {/* Overview */}
      <section className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
        <p>
          Atala has three core contracts, all written in Solidity 0.8.24 and compiled with Foundry
          targeting the <span className="text-foreground font-medium">cancun</span> EVM version.
          They use OpenZeppelin 5.x for standard patterns (SafeERC20, ERC4626, Ownable2Step, ReentrancyGuard)
          and integrate with Euler V2&apos;s EVC for cross-vault operations.
        </p>
        <p>
          All contracts have been tested with <span className="text-emerald-400">40 passing tests</span> covering
          core functionality, access control, edge cases, and integration scenarios.
        </p>
      </section>

      {/* AtalaVault */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10">
            <span className="text-xs font-bold text-cyan-400 font-mono">V</span>
          </div>
          <h2 className="text-2xl font-semibold">AtalaVault</h2>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3 text-sm text-muted-foreground">
          <p className="text-[15px]">
            An ERC-4626 aggregator vault (~440 LOC) that distributes deposits across multiple Euler V2 sub-vaults.
          </p>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Key features</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>ERC-4626 compliant — composable with any vault-aware protocol</li>
              <li>Multi sub-vault allocation with per-vault supply caps</li>
              <li>Configurable supply and withdraw queue ordering</li>
              <li>Role-based access: Owner, Curator, Allocator, Sentinel</li>
              <li>Two-step ownership transfer (Ownable2Step)</li>
              <li>Reentrancy protection on all state-changing functions</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Core functions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["deposit(assets, receiver)", "Supply assets, receive vault shares"],
                    ["withdraw(assets, receiver, owner)", "Withdraw assets by burning shares"],
                    ["addSubVault(vault, cap)", "Add a new Euler V2 sub-vault"],
                    ["removeSubVault(vault)", "Remove a sub-vault (Sentinel+)"],
                    ["setSupplyCap(vault, cap)", "Update allocation cap (Curator+)"],
                    ["setSupplyQueue(vaults[])", "Set deposit order (Curator+)"],
                    ["setWithdrawQueue(vaults[])", "Set withdraw order (Curator+)"],
                    ["rebalance(allocations[])", "Move funds between sub-vaults (Allocator+)"],
                  ].map(([fn, desc]) => (
                    <tr key={fn} className="border-b border-border/20 last:border-0">
                      <td className="py-1.5 pr-4 text-cyan-400 whitespace-nowrap">{fn}</td>
                      <td className="py-1.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* AtalaFactory */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
            <span className="text-xs font-bold text-emerald-400 font-mono">F</span>
          </div>
          <h2 className="text-2xl font-semibold">AtalaFactory</h2>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3 text-sm text-muted-foreground">
          <p className="text-[15px]">
            A permissionless factory contract for deploying AtalaVault instances.
          </p>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Key features</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>One-click vault deployment with asset, name, and symbol</li>
              <li>Tracks all deployed vaults with their owners</li>
              <li>Emits events for front-end discovery</li>
              <li>No access control — anyone can deploy</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Core functions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["createVault(asset, evc, name, symbol)", "Deploy a new AtalaVault"],
                    ["getVaults()", "List all deployed vault addresses"],
                    ["getVaultsByOwner(owner)", "List vaults owned by an address"],
                    ["vaultCount()", "Total number of deployed vaults"],
                  ].map(([fn, desc]) => (
                    <tr key={fn} className="border-b border-border/20 last:border-0">
                      <td className="py-1.5 pr-4 text-emerald-400 whitespace-nowrap">{fn}</td>
                      <td className="py-1.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* AtalaAgent */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
            <span className="text-xs font-bold text-amber-400 font-mono">A</span>
          </div>
          <h2 className="text-2xl font-semibold">AtalaAgent</h2>
        </div>

        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-3 text-sm text-muted-foreground">
          <p className="text-[15px]">
            A keeper-pattern contract that automates rebalancing for AtalaVaults.
          </p>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Key features</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li>Registers as EVC account operator for cross-vault calls</li>
              <li>Owner-restricted: only the deployer can trigger rebalancing</li>
              <li>Operates within Allocator role boundaries</li>
              <li>Supports batch rebalance across multiple sub-vaults</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-foreground text-sm">Core functions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {[
                    ["rebalance(vault, allocations[])", "Execute rebalance on a target AtalaVault"],
                    ["registerAsOperator(evc, vault)", "Register as EVC operator for a vault"],
                  ].map(([fn, desc]) => (
                    <tr key={fn} className="border-b border-border/20 last:border-0">
                      <td className="py-1.5 pr-4 text-amber-400 whitespace-nowrap">{fn}</td>
                      <td className="py-1.5 text-muted-foreground">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Dependencies */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Dependencies</h2>
        <div className="overflow-hidden rounded-xl border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/50">
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Package</th>
                <th className="px-4 py-2.5 text-left font-medium text-foreground">Usage</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {[
                ["OpenZeppelin 5.x", "SafeERC20, ERC4626, Ownable2Step, ReentrancyGuard"],
                ["Euler Vault Kit (EVK)", "IEVault interface for sub-vault interactions"],
                ["Ethereum Vault Connector", "IEVC interface for operator registration & batch calls"],
                ["forge-std v1.15", "Test framework and utilities"],
              ].map(([pkg, usage]) => (
                <tr key={pkg} className="border-b border-border/20 last:border-0">
                  <td className="px-4 py-2 font-medium text-foreground whitespace-nowrap">{pkg}</td>
                  <td className="px-4 py-2">{usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Source code */}
      <section className="rounded-xl border border-border/40 bg-card/30 p-6 space-y-2">
        <h3 className="font-semibold text-foreground">Source Code</h3>
        <p className="text-sm text-muted-foreground">
          All contracts are open source and available on GitHub.
        </p>
        <a
          href="https://github.com/skar8848/Atala.fi/tree/main/src"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          View on GitHub &rarr;
        </a>
      </section>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Link href="/docs/vaults" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Atala Vaults
        </Link>
        <Link href="/docs" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
          Back to Overview &rarr;
        </Link>
      </div>
    </div>
  );
}
