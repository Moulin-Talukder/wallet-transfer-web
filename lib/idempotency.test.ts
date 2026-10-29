import { describe, expect, it } from "vitest";
import { createIdempotencyKeyStore, generateUuid } from "@/lib/idempotency";

function sequentialKeys() {
  let n = 0;
  return () => `key-${++n}`;
}

const bob1500 = { receiverEmail: "bob@example.com", amountPaisa: 150000 };

describe("createIdempotencyKeyStore", () => {
  it("reuses the same key when the same payment is retried", () => {
    const store = createIdempotencyKeyStore(sequentialKeys());

    const first = store.keyFor(bob1500);
    // Network timeout, 429, double click: every retry must carry the same key.
    expect(store.keyFor(bob1500)).toBe(first);
    expect(store.keyFor({ ...bob1500 })).toBe(first);
  });

  it("treats email case and whitespace as the same payment", () => {
    const store = createIdempotencyKeyStore(sequentialKeys());
    const first = store.keyFor(bob1500);
    expect(store.keyFor({ receiverEmail: " BOB@example.com ", amountPaisa: 150000 })).toBe(first);
  });

  it("creates a new key when the amount or receiver changes", () => {
    const store = createIdempotencyKeyStore(sequentialKeys());
    const first = store.keyFor(bob1500);

    const changedAmount = store.keyFor({ ...bob1500, amountPaisa: 150001 });
    expect(changedAmount).not.toBe(first);

    const changedReceiver = store.keyFor({ ...bob1500, receiverEmail: "carol@example.com" });
    expect(changedReceiver).not.toBe(changedAmount);
  });

  it("creates a new key for the next payment after a success, even with identical details", () => {
    const store = createIdempotencyKeyStore(sequentialKeys());
    const first = store.keyFor(bob1500);

    store.reset();

    expect(store.keyFor(bob1500)).not.toBe(first);
  });
});

describe("generateUuid", () => {
  const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it("returns a v4 UUID", () => {
    expect(generateUuid()).toMatch(UUID_V4);
  });

  it("falls back to getRandomValues outside secure contexts (no randomUUID)", () => {
    const original = crypto.randomUUID;
    try {
      Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
      const ids = new Set(Array.from({ length: 50 }, generateUuid));
      expect(ids.size).toBe(50);
      for (const id of ids) expect(id).toMatch(UUID_V4);
    } finally {
      Object.defineProperty(crypto, "randomUUID", { value: original, configurable: true });
    }
  });
});
