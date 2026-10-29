import type { TransferPayload } from "@/lib/transfer-schema";

/**
 * One Idempotency-Key per payment attempt.
 *
 * The key is bound to the payload it was created for. Retrying the same payload
 * (double click, network timeout, 429, "Try again") reuses the key, so the API
 * replays the original transfer instead of moving money twice. A new key is only
 * created after a success, or when the receiver or amount changes. Reusing a key
 * for a different payload would be rejected by the API (IDEMPOTENCY_KEY_REUSED).
 */
export type IdempotencyKeyStore = {
  /** Returns the key for this payload, creating one if the payload is new. */
  keyFor(payload: TransferPayload): string;
  /** Forget the key, e.g. after the API confirmed the transfer, so the next payment gets a fresh one. */
  reset(): void;
};

export function createIdempotencyKeyStore(generate: () => string = generateUuid): IdempotencyKeyStore {
  let current: { key: string; fingerprint: string } | null = null;

  return {
    keyFor(payload) {
      const fingerprint = fingerprintOf(payload);
      if (current?.fingerprint !== fingerprint) {
        current = { key: generate(), fingerprint };
      }
      return current.key;
    },
    reset() {
      current = null;
    },
  };
}

function fingerprintOf({ receiverEmail, amountPaisa }: TransferPayload): string {
  return `${receiverEmail.trim().toLowerCase()}|${amountPaisa}`;
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost), so
 * opening the dev server from a phone over http://192.168.x.x would break it.
 * getRandomValues() is available everywhere and is just as random.
 */
export function generateUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
