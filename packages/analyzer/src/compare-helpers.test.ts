import { describe, expect, it } from "vitest";
import { asAmountString, parseAmount, summarize } from "./compare-helpers.js";

describe("compare-helpers", () => {
  it("parses amount strings and numbers", () => {
    expect(asAmountString("42")).toBe("42");
    expect(asAmountString(7.9)).toBe("7");
    expect(asAmountString("nope")).toBeNull();
    expect(parseAmount("100")).toBe(100n);
    expect(parseAmount("bad")).toBeNull();
  });

  it("summarizes observation statuses", () => {
    expect(
      summarize([
        {
          id: "a",
          status: "matched",
          title: "a",
          explanation: "",
          expected: null,
          observed: null,
          evidence: {},
        },
        {
          id: "b",
          status: "diverged",
          title: "b",
          explanation: "",
          expected: null,
          observed: null,
          evidence: {},
        },
        {
          id: "c",
          status: "incomplete",
          title: "c",
          explanation: "",
          expected: null,
          observed: null,
          evidence: {},
        },
        {
          id: "d",
          status: "not_applicable",
          title: "d",
          explanation: "",
          expected: null,
          observed: null,
          evidence: {},
        },
      ]),
    ).toEqual({ matched: 1, diverged: 1, incomplete: 1, notApplicable: 1 });
  });
});
