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
import { exportItemWorkbook, itemColumns } from "../src/lib/item-workbook";
import { planImportVehicles } from "../src/lib/import-vehicles";
import { prepareItemRows } from "../src/lib/prepare-item-import";

test("modern Excel template has isolated examples and repeated rows create one multi-car item", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const models = [
    {
      id: "opel-astra",
      brand: "opel",
      slug: "astra",
      name: { ar: "أسترا", en: "Astra" },
    },
    {
      id: "chevrolet-cruze",
      brand: "chevrolet",
      slug: "cruze",
      name: { ar: "كروز", en: "Cruze" },
    },
  ];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], models));
  assert.equal(workbook.worksheets[0].rowCount, 1);
  assert.ok(
    workbook.getWorksheet("Examples — copy to Products")!.rowCount >= 3,
  );
  const examples = workbook.getWorksheet("Examples — copy to Products")!,
    products = workbook.worksheets[0];
  for (let n = 2; n <= 3; n++)
    products.addRow((examples.getRow(n).values as unknown[]).slice(1));
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  const parsed = await parseSpreadsheet(
    bytes.buffer as ArrayBuffer,
    "template.xlsx",
  );
  assert.equal(parsed.length, 1);
  const prepared = prepareItemRows(parsed, models, []);
  assert.equal(validateImport(prepared).valid, true);
  assert.match(prepared[0].sku, /^MS-/);
  assert.equal(
    prepared[0].specs["car_years:opel-astra"],
    "2015,2016,2017,2018,2019,2020",
  );
  assert.equal(prepared[0].specs["car_years:chevrolet-cruze"], "2021,2023");
  assert.equal(prepared[0].specs.warranty_months, "12");
  assert.equal(prepared[0].cost, 50000);
  const exported = new Uint8Array(
    await exportItemWorkbook(prepared, [], models),
  );
  const roundtrip = prepareItemRows(
    await parseSpreadsheet(exported.buffer as ArrayBuffer, "items.xlsx"),
    models,
    prepared,
  );
  assert.equal(roundtrip[0].sku, prepared[0].sku);
  assert.equal(roundtrip[0].slug, prepared[0].slug);
  assert.equal(roundtrip[0].specs["car_years:chevrolet-cruze"], "2021,2023");
  assert.equal(roundtrip[0].warranty.en, prepared[0].warranty.en);
  products.getRow(3).getCell(itemColumns.indexOf("sale_price") + 1).value = 999;
  const conflicting = new Uint8Array(await workbook.xlsx.writeBuffer());
  await assert.rejects(
    parseSpreadsheet(conflicting.buffer as ArrayBuffer, "items.xlsx"),
    /conflicting/,
  );
});
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
    specs: {
      ...demoProducts[0].specs,
      country_of_origin: "Germany",
      fitting_position: "front",
      fitment_notes_ar: "أمامي فقط",
      fitment_notes_en: "Front only",
    },
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
  assert.deepEqual(rows[0].specs, p.specs);
  assert.deepEqual(rows[0].partNumbers, ["OEM-12"]);
  assert.deepEqual(rows[0].name, p.name);
  assert.deepEqual(rows[0].warranty, p.warranty);
  assert.equal(validateImport(rows).valid, true);
});

test("blank Excel templates include car reference and country column", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const { vehicles } = await import("../src/lib/catalog");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportXlsx([], vehicles));
  assert.equal(workbook.worksheets[0].name, "Products");
  assert.equal(workbook.worksheets[0].rowCount, 1);
  assert.ok(
    (workbook.worksheets[0].getRow(1).values as unknown[]).includes(
      "country_of_origin",
    ),
  );
  assert.equal(
    workbook.getWorksheet("Vehicles")?.getCell("A2").value,
    vehicles[0].id,
  );
  assert.ok(workbook.getWorksheet("Instructions"));
});

test("Excel prices use EGP, preserve decimals and reject fractional piasters", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const { columns } = await import("../src/lib/spreadsheets");
  const product = {
    ...demoProducts[0],
    price: 20000,
    sale: 15025,
    cost: 12550,
  };
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportXlsx([product]));
  const sheet = workbook.worksheets[0];
  const cell = (key: "price" | "sale" | "cost") =>
    sheet.getRow(2).getCell(columns.indexOf(key) + 1);
  assert.equal(cell("price").value, 200);
  assert.equal(cell("sale").value, 150.25);
  assert.equal(cell("cost").value, 125.5);
  cell("price").value = 300.99;
  const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
  const rows = await parseSpreadsheet(
    bytes.buffer as ArrayBuffer,
    "products.xlsx",
  );
  assert.equal(rows[0].price, 30099);
  assert.equal(rows[0].sale, 15025);
  assert.equal(rows[0].cost, 12550);
  cell("cost").value = 1.001;
  const invalid = new Uint8Array(await workbook.xlsx.writeBuffer());
  await assert.rejects(
    parseSpreadsheet(invalid.buffer as ArrayBuffer, "products.xlsx"),
    /two decimal places/,
  );
});

test("import creates missing makes/models in a side-effect-free plan, reuses names, and rejects ambiguous ranges", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const sheet = workbook.worksheets[0];
  const example = workbook.getWorksheet("Examples — copy to Products")!;
  sheet.addRow((example.getRow(2).values as unknown[]).slice(1));
  const set = (field: string, value: string | number) => {
    sheet.getRow(2).getCell(itemColumns.indexOf(field as any) + 1).value =
      value;
  };
  set("car_make", "New Make");
  set("car_model", "New Model");
  const parse = async () => {
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    return parseSpreadsheet(bytes.buffer as ArrayBuffer, "items.xlsx");
  };
  const rows = await parse();
  const models: any[] = [],
    brands: any[] = [];
  const plan = planImportVehicles(rows, models, brands);
  assert.equal(models.length, 0);
  assert.equal(brands.length, 0);
  assert.equal(plan.additions.length, 1);
  assert.equal(plan.additions[0].brand, "new-make");
  const item = prepareItemRows(plan.rows, plan.models, [])[0];
  assert.equal(
    item.specs[`car_years:${plan.additions[0].id}`],
    "2015,2016,2017,2018,2019,2020",
  );
  assert.match(item.description.en, /New Model 2015/);
  assert.match(item.description.en, /New Model 2020/);
  assert.equal(
    planImportVehicles(rows, plan.models, [
      { slug: "new-make", name: "New Make" },
    ]).additions.length,
    0,
  );
  set("start_year", 2020);
  set("end_year", 2015);
  await assert.rejects(parse(), /year/i);
  set("start_year", 2015);
  set("end_year", 2020);
  set("years", "2022");
  await assert.rejects(parse(), /leave years blank/);
});

test("empty templates report how to fill Products and never import reference examples", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const bytes = async () => {
    const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
    return buffer.buffer as ArrayBuffer;
  };
  await assert.rejects(
    parseSpreadsheet(await bytes(), "items.xlsx"),
    /No product rows found.*Products.*Examples/,
  );
  workbook.removeWorksheet("Products");
  await assert.rejects(
    parseSpreadsheet(await bytes(), "items.xlsx"),
    /No product rows found/,
  );
});

test("Products is selected by name after worksheet reordering and year columns stay visible", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const products = workbook.getWorksheet("Products")!;
  const examples = workbook.getWorksheet("Examples — copy to Products")!;
  products.addRow((examples.getRow(2).values as unknown[]).slice(1));
  (products as unknown as { orderNo: number }).orderNo = 99;
  assert.notEqual(workbook.worksheets[0].name, "Products");
  assert.equal(
    products.getColumn(itemColumns.indexOf("extra_data") + 1).hidden,
    true,
  );
  for (const key of ["start_year", "end_year", "years"])
    assert.ok(!products.getColumn(itemColumns.indexOf(key as any) + 1).hidden);
  const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
  const rows = await parseSpreadsheet(
    buffer.buffer as ArrayBuffer,
    "items.xlsx",
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(
    rows[0].applications_input[0].years,
    [2015, 2016, 2017, 2018, 2019, 2020],
  );
});
