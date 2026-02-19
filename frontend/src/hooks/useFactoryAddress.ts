"use client";

import { useState, useEffect } from "react";
import { useChainId } from "wagmi";
import { ATALA_FACTORY_ADDRESS } from "@/config/atala";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const LS_KEY = "atala_factory_address";

/** Read factory address from localStorage for a given chain */
function getSavedFactory(chainId: number): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    const addr = saved[String(chainId)];
    return addr && addr !== ZERO_ADDRESS ? addr : null;
  } catch {
    return null;
  }
}

/** Save factory address to localStorage for a given chain */
export function saveFactoryAddress(chainId: number, address: string) {
  if (typeof window === "undefined") return;
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) ?? "{}");
    saved[String(chainId)] = address;
    localStorage.setItem(LS_KEY, JSON.stringify(saved));
  } catch {
    // ignore
  }
}

/**
 * Resolves the effective AtalaFactory address for the current chain.
 * Priority: hardcoded config > localStorage (from browser deploy).
 */
export function useFactoryAddress(): {
  factoryAddress: `0x${string}` | null;
  factoryReady: boolean;
} {
  const chainId = useChainId();
  const configFactory = ATALA_FACTORY_ADDRESS[chainId];
  const configHasFactory = !!configFactory && configFactory !== ZERO_ADDRESS;

  const [savedFactory, setSavedFactory] = useState<`0x${string}` | null>(null);

  useEffect(() => {
    setSavedFactory(getSavedFactory(chainId));
  }, [chainId]);

  // Listen for storage updates from the create page
  useEffect(() => {
    function onStorage() {
      setSavedFactory(getSavedFactory(chainId));
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [chainId]);

  const factoryAddress = configHasFactory ? configFactory : savedFactory;

  return {
    factoryAddress,
    factoryReady: !!factoryAddress,
  };
}
