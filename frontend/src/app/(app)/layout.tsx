"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFullscreen = pathname === "/visualize";

  return (
    <div className="dark bg-background text-foreground min-h-screen">
      <Header />
      {isFullscreen ? (
        <main>{children}</main>
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      )}
    </div>
  );
}
