import { test } from "node:test";
import assert from "node:assert/strict";
import {
  demoProducts,
  demoFits,
  vehicles,
  fitmentLabel,
  normalize,
  priceCart,
} from "../src/lib/catalog";
import { assertDemoAllowed, adapterFor } from "../src/lib/payments";
import { validateImport, csvCell } from "../src/lib/importer";
test("shared product messages disclose only the selected buyer vehicle", () => {
  for (const id of ["opel-astra-2021-0", "peugeot-301-2021-0"]) {
    const v = vehicles.find((v) => v.id === id)!;
    assert.equal(demoFits("demo-1", id), true);
    const message = fitmentLabel(v, true, "en");
    assert.ok(message.includes(v.name.en));
    assert.ok(!message.includes(id.startsWith("opel") ? "Peugeot" : "Opel"));
  }
});
test("different engine is unconfirmed and unselected vehicle prompts selection", () => {
  assert.equal(demoFits("demo-1", "opel-astra-2021-1"), false);
  assert.match(
    fitmentLabel(
      vehicles.find((v) => v.id === "opel-astra-2021-1"),
      false,
      "en",
    ),
    /not confirmed/,
  );
  assert.match(fitmentLabel(undefined, false, "en"), /Choose your car/);
});
test("Arabic and part-number normalization", () => {
  assert.equal(normalize("أَصْلِيّ ـ"), normalize("اصلي"));
  assert.equal(normalize("DEMO- PART / 1"), normalize("demopart1"));
});
test("integer pricing clamps discounts without reducing shipping", () => {
  const result = priceCart(
    [{ product: demoProducts[0], qty: 2 }],
    12500,
    999999,
  );
  assert.deepEqual(result, {
    subtotal: 110000,
    discount: 110000,
    shipping: 12500,
    total: 12500,
  });
  assert.throws(() => priceCart([{ product: demoProducts[0], qty: -1 }], 0));
});
test("production always rejects demo orders and provider adapter fails closed", () => {
  assert.throws(() => assertDemoAllowed(true, "production", "true"));
  assert.throws(() => assertDemoAllowed(true, "development", "false"));
  assert.doesNotThrow(() => assertDemoAllowed(false, "production", "false"));
  assert.throws(() => adapterFor());
});
test("bulk import reports row errors and duplicate SKU before mutation", () => {
  assert.equal(validateImport([demoProducts[0]]).valid, true);
  const bad = validateImport([
    { ...demoProducts[0], sale: -5 },
    demoProducts[0],
    demoProducts[0],
  ]);
  assert.equal(bad.valid, false);
  assert.ok(bad.errors.length > 0);
  assert.match(csvCell("=1+1"), /^"'/);
});
test("public demo projection has no costs or full compatibility matrix", () => {
  for (const p of demoProducts) {
    assert.equal("fitments" in p, false);
    assert.equal("cost" in p, false);
  }
});

test("public API errors identify localized fields and do not expose database internals", async () => {
  const { apiError } = await import("../src/lib/api-errors");
  const { z } = await import("zod");
  const result = z
    .object({ phone: z.string().min(11) })
    .safeParse({ phone: "" });
  assert.equal(result.success, false);
  if (!result.success)
    assert.match(apiError(result.error, "ar"), /رقم الموبايل/);
  assert.equal(
    apiError(Error("relation private.customer_accounts does not exist"), "en"),
    "Unable to complete the request. Check your details and try again.",
  );
  assert.match(apiError(Error("Invalid or expired coupon"), "ar"), /كود الخصم/);
});

test("empty imports have actionable file feedback and validation issues are readable", async () => {
  const { importFeedback } = await import("../src/lib/import-feedback");
  const result = validateImport([]);
  assert.equal(result.valid, false);
  assert.equal(result.errors[0].row, null);
  assert.match(result.errors[0].message, /No product rows found/);
  assert.ok(!importFeedback(result).includes('"row"'));
  assert.equal(
    importFeedback({
      errors: [{ row: 2, field: "sale_price", message: "Enter a price" }],
    }),
    "Item 2 · sale_price: Enter a price",
  );
});
