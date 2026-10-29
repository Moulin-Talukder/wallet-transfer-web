import type { ReactNode } from "react";
import { Snowflake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { Wallet } from "@/lib/api/types";
import { formatPaisa } from "@/lib/money";

type BalanceCardProps = {
  wallet: Wallet;
  /** Optional call to action rendered under the balance, e.g. a "Send money" link. */
  action?: ReactNode;
};

export function BalanceCard({ wallet, action }: BalanceCardProps) {
  return (
    <section
      aria-labelledby="balance-heading"
      className="relative overflow-hidden rounded-2xl bg-linear-to-br from-teal-800 to-teal-950 p-5 text-white shadow-lg shadow-teal-900/10 sm:p-6"
    >
      <div aria-hidden="true" className="absolute -top-16 -right-16 size-48 rounded-full bg-white/5" />
      <div className="relative flex items-start justify-between gap-3">
        <h2 id="balance-heading" className="text-sm font-medium text-teal-100">
          Available balance
        </h2>
        {wallet.is_frozen && (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
            <Snowflake aria-hidden="true" className="size-3" />
            Frozen
          </span>
        )}
      </div>
      <p className="relative mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
        {formatPaisa(wallet.balance)}
      </p>
      <p className="relative mt-1 text-xs text-teal-100/80">{wallet.currency} wallet</p>
      {action && <div className="relative mt-5">{action}</div>}
    </section>
  );
}

export function BalanceCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-2xl bg-teal-900/10 p-5 sm:p-6">
      <Skeleton className="h-4 w-32 bg-teal-900/10" />
      <Skeleton className="mt-3 h-9 w-48 bg-teal-900/10" />
      <Skeleton className="mt-2 h-3 w-20 bg-teal-900/10" />
      <Skeleton className="mt-5 h-11 w-full bg-teal-900/10 sm:w-36" />
    </div>
  );
}
