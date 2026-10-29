import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BalanceCard, BalanceCardSkeleton } from "@/components/balance-card";
import { TransferList, TransferListSkeleton } from "@/components/transfer-list";
import { buttonVariants } from "@/components/ui/button";
import { getTransfers, getWallet } from "@/lib/dal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };

const RECENT_COUNT = 5;

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <Suspense fallback={<BalanceCardSkeleton />}>
          <Balance />
        </Suspense>

        <section aria-labelledby="recent-heading" className="rounded-2xl bg-card px-4 py-4 ring-1 ring-foreground/10 sm:px-5">
          <h2 id="recent-heading" className="font-semibold">
            Recent transfers
          </h2>
          <Suspense fallback={<TransferListSkeleton rows={RECENT_COUNT} />}>
            <RecentTransfers />
          </Suspense>
        </section>
      </div>
    </div>
  );
}

async function Balance() {
  const wallet = await getWallet();
  return (
    <BalanceCard
      wallet={wallet}
      action={
        !wallet.is_frozen && (
          <Link
            href="/transfers/new"
            className={cn(buttonVariants(), "h-11 w-full gap-2 bg-white text-teal-900 hover:bg-teal-50 sm:w-auto sm:px-5")}
          >
            <ArrowUpRight aria-hidden="true" />
            Send money
          </Link>
        )
      }
    />
  );
}

async function RecentTransfers() {
  const { data } = await getTransfers();
  return (
    <TransferList
      transfers={data.slice(0, RECENT_COUNT)}
      emptyAction={
        <Link href="/transfers/new" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}>
          Send your first transfer
        </Link>
      }
    />
  );
}
