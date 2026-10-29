import { WalletMinimal } from "lucide-react";

export function Brand() {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <WalletMinimal aria-hidden="true" className="size-4" />
      </span>
      Wallet
    </span>
  );
}
