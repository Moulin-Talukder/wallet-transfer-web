/**
 * Money helpers. The API stores every amount as an integer number of paisa
 * (1 BDT = 100 paisa), so conversions here use string and integer math only:
 * a float such as 0.1 + 0.2 must never be involved in a payment amount.
 */

export const PAISA_PER_TAKA = 100;

/** Per-transfer limits enforced by the API (StoreTransferRequest). */
export const MIN_TRANSFER_PAISA = 100;
export const MAX_TRANSFER_PAISA = 5_000_000;

const groupFormatter = new Intl.NumberFormat("en-US", { useGrouping: true });

/**
 * Formats integer paisa as BDT, e.g. 150000 -> "৳1,500.00".
 * Western digit grouping is used deliberately, so output does not depend on
 * the runtime's ICU data for the en-BD/bn-BD locales.
 */
export function formatPaisa(paisa: number): string {
  if (!Number.isSafeInteger(paisa)) {
    throw new TypeError(`Expected an integer amount in paisa, got ${paisa}`);
  }

  const sign = paisa < 0 ? "-" : "";
  const abs = Math.abs(paisa);
  const taka = Math.floor(abs / PAISA_PER_TAKA);
  const fraction = String(abs % PAISA_PER_TAKA).padStart(2, "0");

  return `${sign}৳${groupFormatter.format(taka)}.${fraction}`;
}

export type ParseAmountResult =
  | { ok: true; paisa: number }
  | { ok: false; reason: "empty" | "invalid" | "too_many_decimals" | "too_large" };

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d*))?$/;
const GROUPED_PATTERN = /^\d{1,3}(,\d{3})+(\.\d*)?$/;

/**
 * Parses a user-typed BDT amount ("1500", "1,500.5", "0.75") into integer paisa.
 * Rejects negatives, exponents, more than 2 decimals and misplaced commas
 * instead of guessing what the user meant.
 */
export function parseBdtToPaisa(input: string): ParseAmountResult {
  let value = input.trim();
  if (value === "") return { ok: false, reason: "empty" };

  if (value.includes(",")) {
    if (!GROUPED_PATTERN.test(value)) return { ok: false, reason: "invalid" };
    value = value.replaceAll(",", "");
  }

  const match = AMOUNT_PATTERN.exec(value);
  if (!match) return { ok: false, reason: "invalid" };

  const [, whole, fraction = ""] = match;
  if (fraction.length > 2) return { ok: false, reason: "too_many_decimals" };

  // Far above any real limit; also keeps the integer math below exact.
  if (whole.replace(/^0+/, "").length > 12) return { ok: false, reason: "too_large" };

  const paisa = Number(whole) * PAISA_PER_TAKA + Number(fraction.padEnd(2, "0"));
  return { ok: true, paisa };
}
