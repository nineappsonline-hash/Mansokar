import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatYearRanges,
  groupVehicleYears,
} from "../src/lib/vehicle-year-ranges";

test("consecutive vehicle years become one range without mutating the input", () => {
  const rows = [2023, 2019, 2021, 2020, 2022, 2021].map((year) => ({
    brand: "chevrolet",
    model: "كابتيفا",
    year,
  }));
  const before = structuredClone(rows);
  assert.deepEqual(groupVehicleYears(rows), [
    { brand: "chevrolet", model: "كابتيفا", years: "2019–2023" },
  ]);
  assert.deepEqual(rows, before);
});

test("year gaps and single years never imply unsupported compatibility", () => {
  assert.equal(
    formatYearRanges([2019, 2020, 2022, 2024, 2025]),
    "2019–2020, 2022, 2024–2025",
  );
  assert.equal(formatYearRanges([2023, 2023]), "2023");
  assert.equal(formatYearRanges([]), "");
  assert.equal(formatYearRanges([NaN, 2020.5, 2021]), "2021");
});

test("different makes and models stay separate while duplicate labels merge", () => {
  assert.deepEqual(
    groupVehicleYears([
      { brand: "Chevrolet", model: "Captiva", year: 2019 },
      { brand: "Opel", model: "Astra", year: 2021 },
      { brand: "chevrolet ", model: "captiva", year: 2020 },
      { brand: "Chevrolet", model: "Cruze", year: 2020 },
    ]),
    [
      { brand: "Chevrolet", model: "Captiva", years: "2019–2020" },
      { brand: "Opel", model: "Astra", years: "2021" },
      { brand: "Chevrolet", model: "Cruze", years: "2020" },
    ],
  );
});
