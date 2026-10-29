import { Badge } from "@/components/ui/badge";
import type { TransferDirection } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type TransferStatusBadgeProps = {
  direction: TransferDirection;
  status: string;
};

/** "In" / "Out" badge, plus a status badge when the transfer is not completed. */
export function TransferStatusBadge({ direction, status }: TransferStatusBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Badge
        variant="secondary"
        className={cn(
          direction === "in" ? "bg-positive-soft text-positive" : "bg-secondary text-secondary-foreground",
        )}
      >
        {direction === "in" ? "In" : "Out"}
      </Badge>
      {status !== "completed" && (
        <Badge variant="outline" className="capitalize">
          {status}
        </Badge>
      )}
    </span>
  );
}
