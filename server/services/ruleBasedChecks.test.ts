import { describe, expect, it } from "vitest";
import {
  looksLikePii,
  looksLikeSellingIntent,
  removeIsqEntry,
  upsertIsqEntry,
  wordCount,
} from "./ruleBasedChecks";

describe("wordCount", () => {
  it("counts whitespace-separated words", () => {
    expect(wordCount("Cotton Bales")).toBe(2);
    expect(wordCount("Cotton")).toBe(1);
    expect(wordCount("")).toBe(0);
    expect(wordCount(undefined)).toBe(0);
    expect(wordCount("  multiple   spaces  here ")).toBe(3);
  });
});

describe("looksLikePii", () => {
  it("flags phone numbers and emails", () => {
    expect(looksLikePii("Call me at 9876543210")).toBe(true);
    expect(looksLikePii("Reach me at buyer@example.com")).toBe(true);
  });

  it("does not flag short numbers or generic text", () => {
    expect(looksLikePii("Need 100 units, model 12345")).toBe(false);
    expect(looksLikePii("Need cotton bales for spinning unit")).toBe(false);
  });
});

describe("looksLikeSellingIntent", () => {
  it("flags explicit selling phrases", () => {
    expect(looksLikeSellingIntent("We are manufacturers of cotton bales")).toBe(true);
    expect(looksLikeSellingIntent("I have for sale 100 tons of cotton")).toBe(true);
  });

  it("does not flag plain buying requirements", () => {
    expect(looksLikeSellingIntent("Need cotton bales for our spinning unit")).toBe(false);
  });

  it("is intentionally over-inclusive on the bare word 'sell' (LLM resolves ambiguity)", () => {
    // Mirrors the source n8n pre-filter: any "sell" substring triggers the LLM check,
    // even inside a genuine buying statement like "looking for suppliers who sell".
    expect(looksLikeSellingIntent("Looking for suppliers who sell cotton")).toBe(true);
  });
});

describe("removeIsqEntry / upsertIsqEntry", () => {
  it("removes a matching label and value", () => {
    const { asked, filled } = removeIsqEntry(
      ["Color", "Quantity", "Packaging"],
      ["White", 5000, "Bales"],
      "Quantity"
    );
    expect(asked).toEqual(["Color", "Packaging"]);
    expect(filled).toEqual(["White", "Bales"]);
  });

  it("leaves arrays unchanged when label is absent", () => {
    const { asked, filled } = removeIsqEntry(["Color"], ["White"], "Quantity");
    expect(asked).toEqual(["Color"]);
    expect(filled).toEqual(["White"]);
  });

  it("appends a new ISQ entry", () => {
    const { asked, filled } = upsertIsqEntry(["Color"], ["White"], "Probable order value", 5000);
    expect(asked).toEqual(["Color", "Probable order value"]);
    expect(filled).toEqual(["White", 5000]);
  });

  it("updates an existing ISQ entry", () => {
    const { asked, filled } = upsertIsqEntry(
      ["Color", "Probable order value"],
      ["White", 1000],
      "Probable order value",
      5000
    );
    expect(asked).toEqual(["Color", "Probable order value"]);
    expect(filled).toEqual(["White", 5000]);
  });
});
