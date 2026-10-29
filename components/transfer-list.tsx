import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, Inbox } from "lucide-react";
import { TransferStatusBadge } from "@/components/transfer-status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Transfer } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format-date";
import { formatPaisa } from "@/lib/money";
import { cn } from "@/lib/utils";

type TransferListProps = {
  transfers: Transfer[];
  /** Shown under the empty state message, e.g. a "Send money" link. */
  emptyAction?: ReactNode;
};

export function TransferList({ transfers, emptyAction }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Inbox aria-hidden="true" className="size-5 text-muted-foreground" />
        </span>
        <p className="mt-3 font-medium">No transfers yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Money you send or receive will appear here.</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {transfers.map((transfer) => (
        <TransferRow key={transfer.reference} transfer={transfer} />
      ))}
    </ul>
  );
}

function TransferRow({ transfer }: { transfer: Transfer }) {
  const incoming = transfer.direction === "in";
  const Icon = incoming ? ArrowDownLeft : ArrowUpRight;

  return (
    <li className="flex items-center gap-3 py-3">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full",
          incoming ? "bg-positive-soft text-positive" : "bg-muted text-foreground",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{incoming ? "Money received" : "Money sent"}</span>
          <TransferStatusBadge direction={transfer.direction} status={transfer.status} />
        </div>
        <p className="truncate text-xs text-muted-foreground">
          <time dateTime={transfer.created_at}>{formatDateTime(transfer.created_at)}</time>
          <span aria-hidden="true"> · </span>
          <span className="sr-only">, reference </span>
          {/* References are UUIDv7: the leading characters are a timestamp, the tail is random. */}
          <span className="font-mono" title={transfer.reference}>
            …{transfer.reference.slice(-8)}
          </span>
        </p>
      </div>
      <p className={cn("shrink-0 text-right font-semibold tabular-nums", incoming && "text-positive")}>
        <span aria-hidden="true">{incoming ? "+" : "−"}</span>
        <span className="sr-only">{incoming ? "plus " : "minus "}</span>
        {formatPaisa(transfer.amount)}
      </p>
    </li>
  );
}

export function TransferListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ul aria-hidden="true" className="divide-y">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="flex items-center gap-3 py-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-4 w-20" />
        </li>
      ))}
    </ul>
  );
}
