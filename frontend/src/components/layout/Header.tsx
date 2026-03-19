"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useSwitchChain } from "wagmi";
import { avalanche, avalancheFuji } from "wagmi/chains";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/markets", label: "Markets" },
  { href: "/swap", label: "Swap" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/build", label: "Build" },
  { href: "/visualize", label: "Canvas" },
];

const MORE_ITEMS = [
  { href: "/analytics", label: "Analytics" },
  { href: "/address", label: "Address" },
];

const SUPPORTED_CHAINS = [avalanche.id, avalancheFuji.id] as const;

/** Deterministic gradient avatar from an address (GitHub-style). */
function AddressAvatar({ address }: { address: string }) {
  const n = parseInt(address.slice(2, 10), 16);
  const hue1 = n % 360;
  const hue2 = (hue1 + 40 + (n % 60)) % 360;
  return (
    <div
      className="h-6 w-6 rounded-full shrink-0"
      style={{
        background: `linear-gradient(135deg, hsl(${hue1}, 70%, 60%), hsl(${hue2}, 70%, 45%))`,
      }}
    />
  );
}

function AvaxLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={`${className} shrink-0`} viewBox="0 0 254 254" fill="none">
      <circle cx="127" cy="127" r="127" fill="#E84142" />
      <path
        d="M171.8 130.3c4.4-7.6 11.5-7.6 15.9 0l27.4 48.1c4.4 7.6.8 13.8-8 13.8h-55.2c-8.7 0-12.3-6.2-8-13.8l27.9-48.1zM110.5 33.6c4.4-7.6 11.4-7.6 15.8 0l6 10.8 14.2 25.4c3.5 7.2 3.5 15.7 0 22.9l-38.2 66.1c-4.4 7.1-12 11.5-20.4 11.5H46.7c-8.7 0-12.3-6.2-8-13.8l71.8-122.9z"
        fill="#fff"
      />
    </svg>
  );
}

function NetworkSelector({
  currentChainId,
  onSwitch,
}: {
  currentChainId: number;
  onSwitch: (chainId: number) => void;
}) {
  const isMainnet = currentChainId === avalanche.id;
  const isFuji = currentChainId === avalancheFuji.id;
  const isSupportedChain = SUPPORTED_CHAINS.includes(currentChainId as typeof SUPPORTED_CHAINS[number]);

  if (!isSupportedChain) {
    // Wrong network — not Avalanche nor Fuji
    return (
      <button
        onClick={() => onSwitch(avalanche.id)}
        className="hidden sm:flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
        title="Click to switch to Avalanche"
      >
        <AvaxLogo />
        <svg className="w-3.5 h-3.5 text-red-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zM8 11a1 1 0 100 2 1 1 0 000-2z" />
        </svg>
        Wrong Network
      </button>
    );
  }

  return (
    <div className="hidden sm:flex items-center rounded-lg bg-muted p-0.5 gap-0.5">
      <button
        onClick={() => onSwitch(avalanche.id)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all",
          isMainnet
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <AvaxLogo className="w-3.5 h-3.5" />
        {isMainnet && <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
        Mainnet
      </button>
      <button
        onClick={() => onSwitch(avalancheFuji.id)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all",
          isFuji
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <AvaxLogo className="w-3.5 h-3.5" />
        {isFuji && <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
        Fuji
      </button>
    </div>
  );
}

function MoreDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const isMoreActive = MORE_ITEMS.some((item) => pathname === item.href);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isMoreActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
        )}
      >
        ...
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 min-w-[140px] rounded-lg border border-border/40 bg-background/95 backdrop-blur-xl shadow-lg py-1 z-50">
          {MORE_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const { switchChain } = useSwitchChain();

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <a href="/markets" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500">
            <span className="text-sm font-bold text-white">A</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">Atala</span>
          <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs text-cyan-400">
            Beta
          </span>
        </a>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {item.label}
            </a>
          ))}
          <MoreDropdown pathname={pathname} />
        </nav>

        {/* Wallet + Network */}
        <ConnectButton.Custom>
          {({
            account,
            chain,
            openAccountModal,
            openConnectModal,
            mounted,
          }) => {
            const connected = mounted && account && chain;

            if (!mounted) {
              return (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                    <AvaxLogo />
                    Avalanche
                  </div>
                  <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
                </div>
              );
            }

            if (!connected) {
              return (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">
                    <AvaxLogo />
                    Avalanche
                  </div>
                  <button
                    onClick={openConnectModal}
                    className="rounded-lg bg-cyan-500 hover:bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition-colors"
                  >
                    Connect Wallet
                  </button>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-2">
                {/* Chain selector: Mainnet / Fuji toggle */}
                <NetworkSelector
                  currentChainId={chain.id}
                  onSwitch={(chainId) => switchChain({ chainId })}
                />

                {/* Account button: avatar + truncated address */}
                <button
                  onClick={openAccountModal}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 hover:bg-muted px-3 py-1.5 transition-colors"
                >
                  <AddressAvatar address={account.address} />
                  <span className="text-sm font-mono">
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
                  </span>
                </button>
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
