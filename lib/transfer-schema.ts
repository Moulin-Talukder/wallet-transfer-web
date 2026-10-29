import { z } from "zod";
import {
  MAX_TRANSFER_PAISA,
  MIN_TRANSFER_PAISA,
  formatPaisa,
  parseBdtToPaisa,
} from "@/lib/money";

/**
 * Shared by the client form (instant feedback) and the server action (the real check).
 * The amount stays a string in the form and is converted to paisa exactly once, here.
 */
export const transferFormSchema = z.object({
  receiverEmail: z
    .string()
    .trim()
    .min(1, "Enter the receiver's email address.")
    .pipe(z.email("Enter a valid email address.")),
  amount: z.string().superRefine((value, ctx) => {
    const parsed = parseBdtToPaisa(value);
    if (!parsed.ok) {
      ctx.addIssue({ code: "custom", message: AMOUNT_MESSAGES[parsed.reason] });
      return;
    }
    if (parsed.paisa < MIN_TRANSFER_PAISA || parsed.paisa > MAX_TRANSFER_PAISA) {
      ctx.addIssue({ code: "custom", message: AMOUNT_RANGE_MESSAGE });
    }
  }),
});

export type TransferFormValues = z.input<typeof transferFormSchema>;

export const AMOUNT_RANGE_MESSAGE = `Amount must be between ${formatPaisa(MIN_TRANSFER_PAISA)} and ${formatPaisa(MAX_TRANSFER_PAISA)}.`;

const AMOUNT_MESSAGES = {
  empty: "Enter an amount.",
  invalid: "Enter a number, for example 1500 or 1,500.50.",
  too_many_decimals: "Use at most 2 decimal places.",
  too_large: AMOUNT_RANGE_MESSAGE,
} as const;

export type TransferPayload = { receiverEmail: string; amountPaisa: number };

/** Validates form values and converts them to the payload the API expects. */
export function toTransferPayload(
  values: TransferFormValues,
): { ok: true; payload: TransferPayload } | { ok: false; fieldErrors: Partial<Record<keyof TransferFormValues, string>> } {
  const result = transferFormSchema.safeParse(values);
  if (!result.success) {
    const fieldErrors: Partial<Record<keyof TransferFormValues, string>> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0] as keyof TransferFormValues;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const parsed = parseBdtToPaisa(result.data.amount);
  if (!parsed.ok) throw new Error("unreachable: amount was validated above");

  return {
    ok: true,
    payload: {
      receiverEmail: result.data.receiverEmail.toLowerCase(),
      amountPaisa: parsed.paisa,
    },
  };
}
