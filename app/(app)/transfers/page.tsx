import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { TransferList, TransferListSkeleton } from "@/components/transfer-list";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getTransfers } from "@/lib/dal";
import { parsePageParam } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Transfer history" };

export default function TransfersPage({ searchParams }: PageProps<"/transfers">) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Transfer history</h1>
      <Suspense fallback={<HistorySkeleton />}>
        <History searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function History({ searchParams }: Pick<PageProps<"/transfers">, "searchParams">) {
  const page = parsePageParam((await searchParams).page);
  const { data, meta } = await getTransfers(page);
  const sendMoney = (
    <Link href="/transfers/new" className={cn(buttonVariants({ variant: "outline" }), "h-10 px-4")}>
      Send money
    </Link>
  );

  if (data.length === 0 && meta.total > 0) {
    return (
      <div className="mt-6 rounded-2xl bg-card p-6 text-center ring-1 ring-foreground/10">
        <p className="font-medium">There is no page {page}.</p>
        <Link href="/transfers" className={cn(buttonVariants({ variant: "outline" }), "mt-4 h-10 px-4")}>
          Go to the first page
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mt-1 text-sm text-muted-foreground">
        {meta.total} {meta.total === 1 ? "transfer" : "transfers"}, newest first
      </p>
      <section
        aria-label={`Transfers, page ${meta.current_page} of ${meta.last_page}`}
        className="mt-6 rounded-2xl bg-card px-4 py-2 ring-1 ring-foreground/10 sm:px-5"
      >
        <TransferList transfers={data} emptyAction={sendMoney} />
      </section>
      <div className="mt-4">
        <Pagination page={meta.current_page} lastPage={meta.last_page} href={(p) => `/transfers?page=${p}`} />
      </div>
    </>
  );
}

function HistorySkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mt-2 h-4 w-40" />
      <div className="mt-6 rounded-2xl bg-card px-4 py-2 ring-1 ring-foreground/10 sm:px-5">
        <TransferListSkeleton rows={8} />
      </div>
    </div>
  );
}
