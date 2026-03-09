"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";

const CreateVaultContent = lazy(() => import("./CreateVaultContent"));

export default function CreateVaultPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner className="mr-3" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-32">
          <Spinner className="mr-3" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      }
    >
      <CreateVaultContent />
    </Suspense>
  );
}
