"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { shortenAddress } from "@/lib/format";
import { useAtalaWrite } from "@/hooks/useAtalaWrite";
import { atalaVaultAbi } from "@/config/atala";

interface RoleManagerProps {
  vaultAddress: `0x${string}`;
  roles: {
    owner: `0x${string}`;
    curator: `0x${string}`;
    allocator: `0x${string}`;
    sentinel: `0x${string}`;
  };
  isOwner: boolean;
}

const ROLE_LABELS: { key: "curator" | "allocator" | "sentinel"; label: string; fn: string }[] = [
  { key: "curator", label: "Curator", fn: "setCurator" },
  { key: "allocator", label: "Allocator", fn: "setAllocator" },
  { key: "sentinel", label: "Sentinel", fn: "setSentinel" },
];

function isValidAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

export function RoleManager({ vaultAddress, roles, isOwner }: RoleManagerProps) {
  const [editing, setEditing] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const { writeContract, isPending, isConfirming } = useAtalaWrite();

  function handleSave(fnName: string) {
    if (!isValidAddress(inputValue)) return;
    writeContract({
      address: vaultAddress,
      abi: atalaVaultAbi,
      functionName: fnName as "setCurator" | "setAllocator" | "setSentinel",
      args: [inputValue as `0x${string}`],
    });
    setEditing(null);
    setInputValue("");
  }

  return (
    <div className="space-y-3">
      {/* Owner (non-editable here, uses 2-step transfer) */}
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-muted-foreground">Owner</span>
        <span className="text-sm font-mono">{shortenAddress(roles.owner)}</span>
      </div>

      {ROLE_LABELS.map(({ key, label, fn }) => (
        <div key={key} className="flex items-center justify-between py-2 border-t border-border/20">
          <span className="text-sm text-muted-foreground">{label}</span>
          {editing === key ? (
            <div className="flex items-center gap-1.5">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="0x..."
                className="w-48 h-7 text-xs font-mono"
              />
              <Button
                size="xs"
                onClick={() => handleSave(fn)}
                disabled={!isValidAddress(inputValue) || isPending || isConfirming}
                className="bg-cyan-500 hover:bg-cyan-600 text-white"
              >
                {isPending || isConfirming ? <Spinner className="size-3" /> : "Save"}
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => { setEditing(null); setInputValue(""); }}
              >
                X
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono">{shortenAddress(roles[key])}</span>
              {isOwner && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setEditing(key);
                    setInputValue(roles[key]);
                  }}
                >
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
