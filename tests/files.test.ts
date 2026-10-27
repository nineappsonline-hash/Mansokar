import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { sanitizeImage } from "../src/lib/uploads";
import {
  exportCsv,
  exportXlsx,
  parseSpreadsheet,
} from "../src/lib/spreadsheets";
import { demoProducts } from "../src/lib/catalog";
import { validateImport } from "../src/lib/importer";
test("raster sanitization rejects SVG, spoofed content and oversize payloads", async () => {
  await assert.rejects(
    sanitizeImage(Buffer.from('<svg onload="alert(1)"></svg>')),
  );
  await assert.rejects(sanitizeImage(Buffer.alloc(5_000_001)));
  await assert.rejects(sanitizeImage(Buffer.from([255, 216, 255, 0, 0, 0])));
  const png = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "#f6a800" },
  })
    .png()
    .toBuffer();
  const output = await sanitizeImage(png);
  assert.equal((await sharp(output).metadata()).format, "jpeg");
});
test("spreadsheet round-trip combines exact fitments and rejects conflicting duplicate SKUs", async () => {
  const rows = ["opel-astra-2021-0", "peugeot-301-2021-0"].map(
    (vehicle_config_id) => ({ ...demoProducts[0], vehicle_config_id }),
  );
  const csv = exportCsv(rows);
  const bytes = Buffer.from(csv);
  const actual = await parseSpreadsheet(
    bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer,
    "template.csv",
  );
  assert.equal(actual.length, 1);
  assert.deepEqual(actual[0].fitments, [
    "opel-astra-2021-0",
    "peugeot-301-2021-0",
  ]);
  assert.equal(validateImport(actual).valid, true);
  const invalid = Buffer.from(
    exportCsv([rows[0], { ...rows[1], price: 999999 }]),
  );
  await assert.rejects(
    parseSpreadsheet(
      invalid.buffer.slice(
        invalid.byteOffset,
        invalid.byteOffset + invalid.byteLength,
      ) as ArrayBuffer,
      "template.csv",
    ),
    /conflicting/,
  );
});
test("bounded body reader rejects oversized chunked requests", async () => {
  const { readLimited } = await import("../src/lib/body");
  const request = new Request("http://localhost", {
    method: "POST",
    body: "1234567890",
  });
  await assert.rejects(readLimited(request, 5), /too large/);
});

test("XLSX exports preserve private admin fields and treat formula-like product names as text", async () => {
  const p = {
    ...demoProducts[0],
    name: { ar: "اسم المنتج", en: "=SUM(1,2)" },
    cost: 12345,
    warranty: { ar: "ضمان المورد", en: "Supplier warranty" },
    partNumbers: ["OEM-12"],
    vehicle_config_id: "opel-astra-2021-0",
  };
  const bytes = new Uint8Array(await exportXlsx([p]));
  const rows = await parseSpreadsheet(
    bytes.buffer as ArrayBuffer,
    "export.xlsx",
  );
  assert.equal(rows[0].cost, 12345);
  assert.deepEqual(rows[0].partNumbers, ["OEM-12"]);
  assert.deepEqual(rows[0].name, p.name);
  assert.deepEqual(rows[0].warranty, p.warranty);
  assert.equal(validateImport(rows).valid, true);
});
