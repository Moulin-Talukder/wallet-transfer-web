import { Suspense } from "react";
import type { Metadata } from "next";
import { Snowflake } from "lucide-react";
import { TransferForm } from "@/components/transfer-form";
import { Skeleton } from "@/components/ui/skeleton";
import { createTransfer } from "@/lib/actions/transfers";
import { getWallet } from "@/lib/dal";
import { formatPaisa } from "@/lib/money";

export const metadata: Metadata = { title: "Send money" };

export default function NewTransferPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Send money</h1>
      <Suspense fallback={<NewTransferSkeleton />}>
        <NewTransfer />
      </Suspense>
    </div>
  );
}

async function NewTransfer() {
  const wallet = await getWallet();

  if (wallet.is_frozen) {
    return (
      <div role="status" className="mt-6 flex gap-3 rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <Snowflake aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Your wallet is frozen</p>
          <p className="mt-1 text-sm text-muted-foreground">Sending money is disabled. Please contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">
        Available balance: <span className="font-medium text-foreground tabular-nums">{formatPaisa(wallet.balance)}</span>
      </p>
      <div className="mt-6 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <TransferForm sendTransfer={createTransfer} balance={wallet.balance} />
      </div>
    </>
  );
}

function NewTransferSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-6 space-y-5 rounded-2xl bg-card p-5 ring-1 ring-foreground/10 sm:p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
