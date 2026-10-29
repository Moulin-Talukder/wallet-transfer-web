import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  lastPage: number;
  /** Builds the URL for a page, e.g. (p) => `/transfers?page=${p}`. */
  href: (page: number) => string;
};

export function Pagination({ page, lastPage, href }: PaginationProps) {
  if (lastPage <= 1) return null;

  const linkClass = cn(buttonVariants({ variant: "outline" }), "h-10 gap-1 px-3");
  const disabledClass = cn(linkClass, "pointer-events-none opacity-50");

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass} rel="prev">
          <ChevronLeft aria-hidden="true" />
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          <ChevronLeft aria-hidden="true" />
          Previous
        </span>
      )}

      <p className="text-sm text-muted-foreground" aria-current="page">
        Page {page} of {lastPage}
      </p>

      {page < lastPage ? (
        <Link href={href(page + 1)} className={linkClass} rel="next">
          Next
          <ChevronRight aria-hidden="true" />
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClass}>
          Next
          <ChevronRight aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
