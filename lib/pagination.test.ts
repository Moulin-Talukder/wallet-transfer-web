import { describe, expect, it } from "vitest";
import { parsePageParam } from "@/lib/pagination";

describe("parsePageParam", () => {
  it.each([
    [undefined, 1],
    ["", 1],
    ["1", 1],
    ["2", 2],
    ["0", 1],
    ["-3", 1],
    ["2.5", 1],
    ["abc", 1],
    ["1e3", 1],
    ["9999999", 1],
    [["3", "4"], 3],
  ])("parses %j as page %i", (value, page) => {
    expect(parsePageParam(value)).toBe(page);
  });
});
