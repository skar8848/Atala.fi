"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalanche, avalancheFuji } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Atala",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "demo",
  chains: [avalanche, avalancheFuji],
  ssr: true,
});
