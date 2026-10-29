import { describe, expect, it } from "vitest";
import { formatPaisa, parseBdtToPaisa } from "@/lib/money";

describe("formatPaisa", () => {
  it.each([
    [150000, "৳1,500.00"],
    [0, "৳0.00"],
    [1, "৳0.01"],
    [10, "৳0.10"],
    [150050, "৳1,500.50"],
    [5_000_000, "৳50,000.00"],
    [123456789, "৳1,234,567.89"],
    [-2550, "-৳25.50"],
  ])("formats %i paisa as %s", (paisa, expected) => {
    expect(formatPaisa(paisa)).toBe(expected);
  });

  it("rejects non-integer amounts instead of rounding them", () => {
    expect(() => formatPaisa(100.5)).toThrow(TypeError);
    expect(() => formatPaisa(Number.NaN)).toThrow(TypeError);
  });
});

describe("parseBdtToPaisa", () => {
  it.each([
    ["1500", 150000],
    ["1500.5", 150050],
    ["1500.50", 150050],
    ["0.01", 1],
    ["0.1", 10],
    ["1,500.75", 150075],
    ["50,000", 5_000_000],
    ["  42  ", 4200],
    ["007", 700],
    ["12.", 1200],
  ])("parses %j as %i paisa", (input, paisa) => {
    expect(parseBdtToPaisa(input)).toEqual({ ok: true, paisa });
  });

  it("does not use float math: 0.29 and 1.15 stay exact", () => {
    // 0.29 * 100 === 28.999999999999996 and 1.15 * 100 === 114.99999999999999 in floats.
    expect(parseBdtToPaisa("0.29")).toEqual({ ok: true, paisa: 29 });
    expect(parseBdtToPaisa("1.15")).toEqual({ ok: true, paisa: 115 });
  });

  it.each([
    ["", "empty"],
    ["   ", "empty"],
    ["1.234", "too_many_decimals"],
    ["-5", "invalid"],
    ["1e3", "invalid"],
    ["abc", "invalid"],
    [".5", "invalid"],
    ["1,50", "invalid"],
    ["15,00.00", "invalid"],
    ["1 500", "invalid"],
    ["৳100", "invalid"],
    ["9999999999999", "too_large"],
  ])("rejects %j (%s)", (input, reason) => {
    expect(parseBdtToPaisa(input)).toEqual({ ok: false, reason });
  });
});
