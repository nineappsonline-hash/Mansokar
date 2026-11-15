import { test } from "node:test";
import assert from "node:assert/strict";
import { orderSearchTerm } from "../src/lib/admin-order-search";

test("Arabic customer names and phone numbers are valid", () => {
  for (const value of ["محمد أحمد", "أحمد عبد الرحمن", "01012345678", "ORD-2026/123", "MG ZS"]) {
    assert.deepEqual(orderSearchTerm(value), { term: value, valid: true });
  }
});
test("PostgREST operators and wildcard syntax are rejected", () => {
  for (const value of ["a,b", "name.eq.x", "(a)", "100%", "abc_def", '"abc"']) {
    assert.equal(orderSearchTerm(value).valid, false, value);
  }
});
test("search is trimmed and limited to 80 characters", () => {
  assert.equal(orderSearchTerm("  محمد  ").term, "محمد");
  assert.equal(orderSearchTerm("a".repeat(120)).term.length, 80);
});
