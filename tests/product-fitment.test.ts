import { test } from "node:test";
import assert from "node:assert/strict";
import { applicationSpecs, readApplications } from "../src/lib/product-applications";

test("product model/year selection roundtrips without losing unrelated specs", () => {
  const original = { authenticity: "أصلي", country_of_origin: "Egypt", "car_years:old-model": "2012" };
  const updated = applicationSpecs(original, [
    { model_id: "opel-astra", years: [2020, 2018, 2020, 2019] },
    { model_id: "mg-zs", years: [2021] },
  ]);
  assert.equal(updated.authenticity, "أصلي");
  assert.equal(updated.country_of_origin, "Egypt");
  assert.equal(updated["car_years:old-model"], undefined);
  assert.equal(updated["car_years:opel-astra"], "2018,2019,2020");
  assert.equal(updated["car_years:mg-zs"], "2021");
  assert.deepEqual(readApplications(updated), [
    { model_id: "opel-astra", years: [2018, 2019, 2020] },
    { model_id: "mg-zs", years: [2021] },
  ]);
});

test("empty model selection removes stale compatibility without touching other specs", () => {
  const result = applicationSpecs({ "car_years:opel-astra": "2015", warranty_months: "12" }, []);
  assert.deepEqual(result, { warranty_months: "12" });
  assert.deepEqual(readApplications(result), []);
});

test("invalid years are excluded when reading compatibility", () => {
  assert.deepEqual(readApplications({ "car_years:model": "2018,foo,1949,2101,2020" }), [
    { model_id: "model", years: [2018, 2020] },
  ]);
});
