"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiRequest } from "@/lib/api/client";
import type { ApiFailure, Transfer } from "@/lib/api/types";
import { clearSessionToken, getSessionToken } from "@/lib/session";
import { toTransferPayload, type TransferFormValues } from "@/lib/transfer-schema";

export type CreateTransferResult =
  | { ok: true; transfer: Transfer; replayed: boolean }
  | { ok: false; error: ApiFailure };

const idempotencyKeySchema = z.uuid();

/**
 * Sends money. The client owns the Idempotency-Key (one per payment attempt) and
 * passes it in; this action forwards it unchanged, so a retry from the browser
 * reaches Laravel with the same key. Input is re-validated here: the form's
 * validation is only a convenience, anyone can call this action directly.
 */
export async function createTransfer(
  values: TransferFormValues,
  idempotencyKey: string,
): Promise<CreateTransferResult> {
  const token = await getSessionToken();
  if (!token) return { ok: false, error: { kind: "unauthenticated" } };

  const validated = toTransferPayload(values);
  if (!validated.ok) {
    const { receiverEmail, amount } = validated.fieldErrors;
    return {
      ok: false,
      error: {
        kind: "validation",
        message: "Some of the details are not valid.",
        fieldErrors: {
          ...(receiverEmail && { receiver_email: [receiverEmail] }),
          ...(amount && { amount: [amount] }),
        },
      },
    };
  }
  if (!idempotencyKeySchema.safeParse(idempotencyKey).success) {
    return { ok: false, error: { kind: "validation", message: "Invalid payment attempt. Reload the page.", fieldErrors: {} } };
  }

  const result = await apiRequest<{ data: Transfer }>("/transfers", {
    method: "POST",
    token,
    headers: { "Idempotency-Key": idempotencyKey },
    body: { receiver_email: validated.payload.receiverEmail, amount: validated.payload.amountPaisa },
  });

  if (!result.ok) {
    // The client navigates to /login; redirect() here would reject the awaiting promise.
    if (result.error.kind === "unauthenticated") await clearSessionToken();
    return { ok: false, error: result.error };
  }

  revalidatePath("/dashboard");
  return {
    ok: true,
    transfer: result.data.data,
    replayed: result.headers.get("Idempotent-Replayed") === "true",
  };
}
