"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DOCS_NAV = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs", label: "Overview" },
      { href: "/docs/why-atala", label: "Why Atala" },
    ],
  },
  {
    title: "Protocols",
    items: [
      { href: "/docs/protocols", label: "Euler V2 & Silo V2" },
    ],
  },
  {
    title: "Atala Vaults",
    items: [
      { href: "/docs/vaults", label: "Vault System" },
    ],
  },
  {
    title: "Developers",
    items: [
      { href: "/docs/contracts", label: "Smart Contracts" },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex gap-8 min-h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 border-r border-border/40 pr-6 py-2">
        <nav className="sticky top-24 space-y-6">
          {DOCS_NAV.map((section) => (
            <div key={section.title}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2">
                {section.title}
              </h4>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        pathname === item.href
                          ? "bg-cyan-500/10 text-cyan-400 font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/40 bg-background/95 backdrop-blur-xl p-1.5 shadow-lg">
          {DOCS_NAV.flatMap((s) => s.items).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                pathname === item.href
                  ? "bg-cyan-500/10 text-cyan-400"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Content */}
      <article className="flex-1 min-w-0 py-2 pb-24 lg:pb-8">
        {children}
      </article>
    </div>
  );
}
