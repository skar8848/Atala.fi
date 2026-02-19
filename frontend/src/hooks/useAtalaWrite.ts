"use client";

import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { avalanche } from "wagmi/chains";

function getExplorerUrl(chainId: number, hash: string): string {
  const base = chainId === avalanche.id
    ? "https://snowtrace.io"
    : "https://testnet.snowtrace.io";
  return `${base}/tx/${hash}`;
}

export function useAtalaWrite() {
  const chainId = useChainId();
  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const toastedHash = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (isSuccess && hash && toastedHash.current !== hash) {
      toastedHash.current = hash;
      const url = getExplorerUrl(chainId, hash);
      toast.success("Transaction confirmed", {
        description: `${hash.slice(0, 10)}...${hash.slice(-6)}`,
        action: {
          label: "View on Explorer",
          onClick: () => window.open(url, "_blank"),
        },
      });
    }
  }, [isSuccess, hash, chainId]);

  useEffect(() => {
    if (error) {
      const msg =
        (error as { shortMessage?: string }).shortMessage ?? error.message;
      toast.error("Transaction failed", { description: msg });
    }
  }, [error]);

  return {
    writeContract,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
