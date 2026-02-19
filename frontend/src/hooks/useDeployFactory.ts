"use client";

import { useDeployContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { avalanche } from "wagmi/chains";
import { ATALA_FACTORY_BYTECODE } from "@/config/factory-bytecode";
import { EVC_ADDRESS, atalaFactoryAbi } from "@/config/atala";

function getExplorerUrl(chainId: number, hash: string): string {
  const base = chainId === avalanche.id
    ? "https://snowtrace.io"
    : "https://testnet.snowtrace.io";
  return `${base}/tx/${hash}`;
}

export function useDeployFactory() {
  const chainId = useChainId();
  const {
    deployContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useDeployContract();

  const { data: receipt, isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const toastedHash = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (error) {
      const msg =
        (error as { shortMessage?: string }).shortMessage ?? error.message;
      toast.error("Factory deployment failed", { description: msg });
    }
  }, [error]);

  useEffect(() => {
    if (isSuccess && hash && toastedHash.current !== hash) {
      toastedHash.current = hash;
      const url = getExplorerUrl(chainId, hash);
      toast.success("Factory deployed!", {
        description: `${hash.slice(0, 10)}...${hash.slice(-6)}`,
        action: {
          label: "View on Explorer",
          onClick: () => window.open(url, "_blank"),
        },
      });
    }
  }, [isSuccess, hash, chainId]);

  function deploy() {
    deployContract({
      abi: atalaFactoryAbi,
      bytecode: ATALA_FACTORY_BYTECODE as `0x${string}`,
      args: [EVC_ADDRESS],
    });
  }

  // Extract the deployed contract address from the receipt
  const factoryAddress = receipt?.contractAddress ?? null;

  return {
    deploy,
    hash,
    factoryAddress,
    isPending,
    isConfirming,
    isSuccess,
    error,
    reset,
  };
}
