import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atala - Unified Lending Hub on Avalanche",
  description:
    "Explore and compare lending markets across Euler V2 and Morpho Blue on Avalanche. Be your own curator.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <div
          id="page-cover"
          style={{
            position: "fixed",
            inset: 0,
            background: "#ffffff",
            zIndex: 99999,
            transition: "opacity 0.4s ease",
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('load',function(){var c=document.getElementById('page-cover');if(c){c.style.opacity='0';setTimeout(function(){c.remove()},500)}})`,
          }}
        />
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
