"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { decodeEventLog } from "viem";
import { avalanche } from "wagmi/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TokenIcon } from "@/components/markets/VaultTable";
import { useAtalaWrite } from "@/hooks/useAtalaWrite";
import { useDeployFactory } from "@/hooks/useDeployFactory";
import { useFactoryAddress, saveFactoryAddress } from "@/hooks/useFactoryAddress";
import Link from "next/link";
import {
  VAULT_CREATION_ASSETS,
  atalaFactoryAbi,
  type CreationAsset,
} from "@/config/atala";

type Step = 1 | 2 | 3;

function getExplorerUrl(chainId: number, hash: string): string {
  const base = chainId === avalanche.id
    ? "https://snowtrace.io"
    : "https://testnet.snowtrace.io";
  return `${base}/tx/${hash}`;
}

function getExplorerAddressUrl(chainId: number, addr: string): string {
  const base = chainId === avalanche.id
    ? "https://snowtrace.io"
    : "https://testnet.snowtrace.io";
  return `${base}/address/${addr}`;
}

export default function CreateVaultContent() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [step, setStep] = useState<Step>(1);
  const [selectedAsset, setSelectedAsset] = useState<CreationAsset | null>(null);
  const [vaultName, setVaultName] = useState("");
  const [vaultSymbol, setVaultSymbol] = useState("");
  const [newVaultAddress, setNewVaultAddress] = useState<string | null>(null);

  // Factory address resolution (config > localStorage)
  const { factoryAddress: resolvedFactory, factoryReady: factoryReadyFromHook } = useFactoryAddress();

  // Factory deployment hook
  const {
    deploy: deployFactory,
    hash: factoryDeployHash,
    factoryAddress: deployedFactoryAddress,
    isPending: isFactoryPending,
    isConfirming: isFactoryConfirming,
    isSuccess: isFactorySuccess,
  } = useDeployFactory();

  // Vault creation hook
  const { writeContract, hash, isPending, isConfirming, isSuccess, reset } = useAtalaWrite();

  // Parse VaultCreated event from tx receipt
  const { data: receipt } = useWaitForTransactionReceipt({ hash });

  // Save newly deployed factory to localStorage
  useEffect(() => {
    if (deployedFactoryAddress) {
      saveFactoryAddress(chainId, deployedFactoryAddress);
    }
  }, [deployedFactoryAddress, chainId]);

  // Effective factory: resolved from hook OR just deployed in this session
  const effectiveFactory: `0x${string}` | null = resolvedFactory
    ?? (deployedFactoryAddress as `0x${string}` | null);

  const factoryReady = factoryReadyFromHook || !!deployedFactoryAddress;

  // Parse VaultCreated event
  useEffect(() => {
    if (receipt && isSuccess && !newVaultAddress) {
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: atalaFactoryAbi,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName === "VaultCreated") {
            const addr = (decoded.args as { vault: `0x${string}` }).vault;
            setNewVaultAddress(addr);
            return;
          }
        } catch {
          // Not our event
        }
      }
    }
  }, [receipt, isSuccess, newVaultAddress]);

  function handleSelectAsset(asset: CreationAsset) {
    setSelectedAsset(asset);
    setVaultName(asset.suggestedVaultName);
    setVaultSymbol(asset.suggestedSymbol);
    setStep(2);
  }

  function handleDeploy() {
    if (!selectedAsset || !address || !effectiveFactory) return;
    writeContract({
      address: effectiveFactory,
      abi: atalaFactoryAbi,
      functionName: "createVault",
      args: [selectedAsset.address, vaultName, vaultSymbol, address],
    });
  }

  // --- Not connected ---
  if (!isConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deploy your own ERC-4626 yield aggregation vault
          </p>
        </div>
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-sm text-muted-foreground">
              Connect your wallet to create a vault
            </p>
            <ConnectButton />
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Success: vault created ---
  if (newVaultAddress && hash) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
              <svg className="w-7 h-7 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8.5l3.5 3.5L13 4" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Vault Created</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your vault has been deployed successfully
              </p>
            </div>
            <div className="rounded-lg border border-border/30 bg-muted/30 px-4 py-3 w-full max-w-md">
              <p className="text-[10px] text-muted-foreground mb-1">Vault Address</p>
              <p className="text-sm font-mono break-all">{newVaultAddress}</p>
            </div>
            <a
              href={getExplorerUrl(chainId, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              View transaction on Explorer
            </a>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" asChild>
                <Link href="/build">Back to Build</Link>
              </Button>
              <Button
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
                asChild
              >
                <Link href={`/build/${newVaultAddress}`}>
                  Manage Vault
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Tx confirmed but no VaultCreated event ---
  if (isSuccess && receipt && !newVaultAddress && hash) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card className="border-border/40 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
              <svg className="w-7 h-7 text-amber-400" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zM7.25 4.5a.75.75 0 011.5 0v4a.75.75 0 01-1.5 0v-4zM8 11a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold">Transaction Sent</h2>
              <p className="text-sm text-muted-foreground mt-1">
                The transaction was confirmed but no vault was created.
                Check the transaction on the explorer for details.
              </p>
            </div>
            <a
              href={getExplorerUrl(chainId, hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
            >
              View transaction on Explorer
            </a>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setNewVaultAddress(null);
              }}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/build"
          className="flex items-center justify-center h-8 w-8 rounded-lg border border-border/40 hover:bg-muted transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 3L5 8l5 5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {factoryReady ? `Step ${step} of 3` : "Deploy factory first"}
          </p>
        </div>
      </div>

      {/* Factory not deployed -> Deploy Factory card */}
      {!factoryReady && (
        <>
          {/* Factory just deployed success */}
          {isFactorySuccess && deployedFactoryAddress ? (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardContent className="flex flex-col items-center justify-center py-10 gap-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
                  <svg className="w-6 h-6 text-emerald-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8.5l3.5 3.5L13 4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Factory Deployed</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    AtalaFactory is live. You can now create vaults.
                  </p>
                </div>
                <div className="rounded-lg border border-border/30 bg-muted/30 px-4 py-2 w-full max-w-sm">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Factory Address</p>
                  <p className="text-xs font-mono break-all">{deployedFactoryAddress}</p>
                </div>
                {factoryDeployHash && (
                  <a
                    href={getExplorerUrl(chainId, factoryDeployHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors"
                  >
                    View deploy tx on Explorer
                  </a>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Deploy AtalaFactory</CardTitle>
                <p className="text-sm text-muted-foreground">
                  The factory contract needs to be deployed on this network before you can create vaults.
                  This is a one-time setup.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/30 divide-y divide-border/30">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Network</span>
                    <Badge variant="secondary">
                      {chainId === avalanche.id ? "Avalanche" : "Fuji Testnet"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">EVC</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      0xddcb...F36Fa1
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Deployer</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-400">
                    This will deploy the AtalaFactory smart contract. Gas fees apply.
                    After deployment, anyone can create vaults through this factory.
                  </p>
                </div>
                <Button
                  onClick={deployFactory}
                  disabled={isFactoryPending || isFactoryConfirming}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white w-full"
                >
                  {isFactoryPending ? (
                    <>
                      <Spinner className="mr-2" />
                      Confirm in Wallet...
                    </>
                  ) : isFactoryConfirming ? (
                    <>
                      <Spinner className="mr-2" />
                      Deploying Factory...
                    </>
                  ) : (
                    "Deploy Factory"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Factory ready -> show vault creation wizard */}
      {factoryReady && (
        <>
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-cyan-500" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {/* Factory info badge */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Factory:</span>
            <a
              href={getExplorerAddressUrl(chainId, effectiveFactory!)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-cyan-400/70 hover:text-cyan-400 transition-colors"
            >
              {effectiveFactory!.slice(0, 6)}...{effectiveFactory!.slice(-4)}
            </a>
          </div>

          {/* Step 1: Choose Asset */}
          {step === 1 && (
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Choose Underlying Asset</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Select the token your vault will accept for deposits
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {VAULT_CREATION_ASSETS.map((asset) => (
                    <button
                      key={asset.address}
                      onClick={() => handleSelectAsset(asset)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-all hover:border-cyan-500/50 hover:bg-cyan-500/5 ${
                        selectedAsset?.address === asset.address
                          ? "border-cyan-500 bg-cyan-500/10"
                          : "border-border/40"
                      }`}
                    >
                      <TokenIcon symbol={asset.symbol} size="lg" />
                      <div>
                        <p className="text-sm font-medium">{asset.symbol}</p>
                        <p className="text-xs text-muted-foreground">{asset.name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Name & Symbol */}
          {step === 2 && selectedAsset && (
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Vault Details</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose a name and symbol for your vault share token
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Asset</label>
                  <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/30 p-2.5">
                    <Badge variant="secondary">{selectedAsset.symbol}</Badge>
                    <span className="text-sm text-muted-foreground">{selectedAsset.name}</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Vault Name</label>
                  <Input
                    value={vaultName}
                    onChange={(e) => setVaultName(e.target.value)}
                    placeholder="e.g., Atala USDC Vault"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Share Symbol</label>
                  <Input
                    value={vaultSymbol}
                    onChange={(e) => setVaultSymbol(e.target.value)}
                    placeholder="e.g., atUSDC"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!vaultName.trim() || !vaultSymbol.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white"
                  >
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Review & Deploy */}
          {step === 3 && selectedAsset && (
            <Card className="border-border/40 bg-card/50">
              <CardHeader>
                <CardTitle className="text-base">Review & Deploy</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Confirm the details and deploy your vault
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border border-border/30 divide-y divide-border/30">
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Asset</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{selectedAsset.symbol}</Badge>
                      <span className="text-xs font-mono text-muted-foreground">
                        {selectedAsset.address.slice(0, 6)}...{selectedAsset.address.slice(-4)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Vault Name</span>
                    <span className="text-sm font-medium">{vaultName}</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Share Symbol</span>
                    <span className="text-sm font-mono">{vaultSymbol}</span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Owner</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3">
                    <span className="text-sm text-muted-foreground">Factory</span>
                    <a
                      href={getExplorerAddressUrl(chainId, effectiveFactory!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-cyan-400/70 hover:text-cyan-400 transition-colors"
                    >
                      {effectiveFactory!.slice(0, 6)}...{effectiveFactory!.slice(-4)}
                    </a>
                  </div>
                </div>

                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                  <p className="text-xs text-amber-400">
                    This will deploy a new smart contract. You will be the owner with full control
                    over roles, sub-vaults, and rebalancing. Gas fees apply.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      reset();
                      setStep(2);
                    }}
                    disabled={isPending || isConfirming}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleDeploy}
                    disabled={isPending || isConfirming}
                    className="bg-cyan-500 hover:bg-cyan-600 text-white flex-1"
                  >
                    {isPending ? (
                      <>
                        <Spinner className="mr-2" />
                        Confirm in Wallet...
                      </>
                    ) : isConfirming ? (
                      <>
                        <Spinner className="mr-2" />
                        Deploying...
                      </>
                    ) : (
                      "Deploy Vault"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
