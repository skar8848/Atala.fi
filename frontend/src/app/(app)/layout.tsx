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
        <main className="px-6 py-6">
          {children}
        </main>
      )}
    </div>
  );
}
