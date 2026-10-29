import type { ApiFailure, BusinessErrorCode } from "@/lib/api/types";

export type UserMessage = {
  title: string;
  message: string;
  /** True when sending the same transfer again could succeed (and is safe: same Idempotency-Key). */
  retryable: boolean;
};

const BUSINESS_MESSAGES: Record<BusinessErrorCode, UserMessage> = {
  INSUFFICIENT_BALANCE: {
    title: "Insufficient balance",
    message: "Your balance is too low for this transfer. Try a smaller amount.",
    retryable: false,
  },
  SAME_WALLET: {
    title: "That's your own wallet",
    message: "You can't send money to yourself. Enter someone else's email address.",
    retryable: false,
  },
  RECEIVER_UNAVAILABLE: {
    title: "Receiver can't accept money",
    message: "This account can't receive transfers right now. Check the email address or try someone else.",
    retryable: false,
  },
  SENDER_FROZEN: {
    title: "Your wallet is frozen",
    message: "Sending money is disabled on your wallet. Please contact support.",
    retryable: false,
  },
  IDEMPOTENCY_KEY_REUSED: {
    title: "Transfer details changed",
    message: "This payment attempt was already used for different details. Review the transfer and send it again.",
    retryable: false,
  },
};

/** Maps any API failure to copy the user can act on. Never shows raw server messages for business errors. */
export function describeFailure(failure: ApiFailure): UserMessage {
  switch (failure.kind) {
    case "business":
      return BUSINESS_MESSAGES[failure.code];
    case "forbidden":
      return BUSINESS_MESSAGES.SENDER_FROZEN;
    case "rate_limited":
      return {
        title: "Too many attempts",
        message:
          failure.retryAfterSeconds !== null
            ? `Please wait ${formatSeconds(failure.retryAfterSeconds)} and try again.`
            : "Please wait a moment and try again.",
        retryable: true,
      };
    case "validation":
      return {
        title: "Check the details",
        message: firstFieldError(failure) ?? "Some of the details are not valid.",
        retryable: false,
      };
    case "unauthenticated":
      return { title: "Session expired", message: "Please sign in again.", retryable: false };
    case "network":
      return {
        title: "No response from the server",
        message: "We couldn't confirm the transfer. Trying again is safe: you won't be charged twice.",
        retryable: true,
      };
    case "server":
      return {
        title: "Something went wrong",
        message: "The server had a problem. Trying again is safe: you won't be charged twice.",
        retryable: true,
      };
  }
}

/** Laravel field names -> TransferForm field names. */
const TRANSFER_FIELDS: Record<string, "receiverEmail" | "amount"> = {
  receiver_email: "receiverEmail",
  amount: "amount",
};

/** Field-level messages for the transfer form, with friendlier copy for Laravel's generic ones. */
export function transferFieldErrors(failure: ApiFailure): Partial<Record<"receiverEmail" | "amount", string>> {
  if (failure.kind !== "validation") return {};

  const result: Partial<Record<"receiverEmail" | "amount", string>> = {};
  for (const [apiField, messages] of Object.entries(failure.fieldErrors)) {
    const field = TRANSFER_FIELDS[apiField];
    if (!field || !messages[0]) continue;
    // Laravel's `exists` rule says "The selected receiver email is invalid."
    result[field] = /selected .* is invalid/i.test(messages[0])
      ? "We couldn't find an account with that email."
      : messages[0];
  }
  return result;
}

function firstFieldError(failure: Extract<ApiFailure, { kind: "validation" }>): string | undefined {
  return Object.values(failure.fieldErrors)[0]?.[0] ?? (failure.message || undefined);
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}
