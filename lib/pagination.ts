/**
 * Reads ?page= from the URL. Anything that is not a positive integer falls back to 1,
 * so a hand-edited URL can never produce an invalid API request.
 */
export function parsePageParam(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d{1,6}$/.test(raw)) return 1;
  return Math.max(1, Number(raw));
}
