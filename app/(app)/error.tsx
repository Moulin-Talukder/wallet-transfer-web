"use client";

import { CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown when the API is unreachable, rate limited or returns an unexpected error while loading a page. */
export default function AppError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <CircleAlert aria-hidden="true" className="size-5 text-destructive" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">We couldn&apos;t load your wallet</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The server didn&apos;t respond or is busy. Wait a moment and try again.
      </p>
      <Button className="mt-6 h-10 px-5" onClick={() => retry()}>
        Try again
      </Button>
    </div>
  );
}
