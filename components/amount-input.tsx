import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type AmountInputProps = Omit<ComponentProps<"input">, "type" | "inputMode">;

/**
 * Text input for a BDT amount. It is a text field rather than type="number", so the
 * value is kept exactly as typed (no float coercion, no scroll-wheel changes) and is
 * converted to integer paisa by parseBdtToPaisa. inputMode shows a decimal keypad on phones.
 */
export function AmountInput({ className, ...props }: AmountInputProps) {
  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-base text-muted-foreground"
      >
        ৳
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        className={cn("h-11 pl-7 text-base tabular-nums", className)}
        {...props}
      />
    </div>
  );
}
