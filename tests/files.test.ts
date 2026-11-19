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
import {
  matchesProductExportFilter,
  parseProductExportFilter,
} from "../src/lib/export-filter";
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
test("item categories survive Excel import, update, and export", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const categories = [
    { slug: "filters", name: { ar: "الفلاتر", en: "Filters" } },
    { slug: "brakes", name: { ar: "الفرامل", en: "Brakes" } },
  ];
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await exportItemWorkbook([], [], [], categories));
  const products = book.getWorksheet("Products")!;
  assert.equal(
    products.getRow(1).getCell(itemColumns.indexOf("category") + 1).value,
    "category",
  );
  assert.equal(
    book.getWorksheet("Categories")!.getRow(2).getCell(1).value,
    "filters",
  );
  const example = book.getWorksheet("Examples — copy to Products")!;
  products.addRow((example.getRow(2).values as unknown[]).slice(1));
  const bytes = new Uint8Array(await book.xlsx.writeBuffer());
  const parsed = await parseSpreadsheet(
    bytes.buffer as ArrayBuffer,
    "categories.xlsx",
  );
  assert.equal(parsed[0].category, "filters");
  const existing = [{ ...parsed[0], category: "brakes" }];
  const models = [{ id: "opel-astra", brand: "opel", slug: "astra", name: { ar: "أسترا", en: "Astra" } }];
  const updated = prepareItemRows(parsed, models, existing);
  assert.equal(updated[0].category, "filters");
  const out = new ExcelJS.Workbook();
  await out.xlsx.load(await exportItemWorkbook(updated, [], [], categories));
  assert.equal(
    out
      .getWorksheet("Products")!
      .getRow(2)
      .getCell(itemColumns.indexOf("category") + 1).value,
    "filters",
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

test("Excel prices use EGP, round numeric precision to piasters and reject fractional text", async () => {
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
  cell("cost").value = 125.5555;
  const rounded = new Uint8Array(await workbook.xlsx.writeBuffer());
  assert.equal(
    (await parseSpreadsheet(rounded.buffer as ArrayBuffer, "products.xlsx"))[0]
      .cost,
    12556,
  );
  cell("cost").value = "1.001";
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

test("formatted blank rows and gaps do not count against the Excel import limit", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const products = workbook.getWorksheet("Products")!;
  products.getRow(2005).values = workbook
    .getWorksheet("Examples — copy to Products")!
    .getRow(2).values;
  products.getRow(10000).getCell(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF0F0F0" },
  };
  products.getRow(8000).getCell(1).value = "   ";
  const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
  const rows = await parseSpreadsheet(
    buffer.buffer as ArrayBuffer,
    "items.xlsx",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].applications_input[0].make, "opel");
  products.getRow(2005).getCell(itemColumns.indexOf("sale_price") + 1).value =
    "invalid";
  const invalid = new Uint8Array(await workbook.xlsx.writeBuffer());
  await assert.rejects(
    parseSpreadsheet(invalid.buffer as ArrayBuffer, "items.xlsx"),
    /Row 2005/,
  );
});

test("the Excel limit accepts 1000 populated rows and rejects 1001 even for one grouped item", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const products = workbook.getWorksheet("Products")!;
  const example = workbook
    .getWorksheet("Examples — copy to Products")!
    .getRow(2).values;
  for (let n = 0; n < 1000; n++) products.getRow(n + 2000).values = example;
  const bytes = async () => new Uint8Array(await workbook.xlsx.writeBuffer());
  let buffer = await bytes();
  assert.equal(
    (await parseSpreadsheet(buffer.buffer as ArrayBuffer, "items.xlsx")).length,
    1,
  );
  products.getRow(9000).values = example;
  buffer = await bytes();
  await assert.rejects(
    parseSpreadsheet(buffer.buffer as ArrayBuffer, "items.xlsx"),
    /more than 1,000 populated product rows/,
  );
});

test("legacy Excel also ignores whitespace and styled empty rows after products", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportXlsx([demoProducts[0]]));
  workbook.worksheets[0].getRow(5000).getCell(1).value = "   ";
  workbook.worksheets[0].getRow(10000).getCell(1).font = { bold: true };
  const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
  const rows = await parseSpreadsheet(
    buffer.buffer as ArrayBuffer,
    "legacy.xlsx",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sku, demoProducts[0].sku);
});

test("new Excel items need no SKU or key and automatically group car rows without merging different parts", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const products = workbook.getWorksheet("Products")!;
  const examples = workbook.getWorksheet("Examples — copy to Products")!;
  for (let n = 2; n <= 3; n++)
    products.addRow((examples.getRow(n).values as unknown[]).slice(1));
  const parse = async () => {
    const bytes = new Uint8Array(await workbook.xlsx.writeBuffer());
    return parseSpreadsheet(bytes.buffer as ArrayBuffer, "items.xlsx");
  };
  let rows = await parse();
  assert.equal(rows.length, 1);
  assert.match(rows[0].sku, /^MS-/);
  assert.equal(rows[0].item_key, rows[0].sku);
  assert.equal(rows[0].applications_input.length, 2);
  products.getRow(3).getCell(itemColumns.indexOf("part_number") + 1).value =
    "OTHER-PART";
  rows = await parse();
  assert.equal(rows.length, 2);
  assert.notEqual(rows[0].sku, rows[1].sku);
  products.getRow(3).getCell(itemColumns.indexOf("part_number") + 1).value =
    "EXAMPLE-123";
  products.getRow(3).getCell(itemColumns.indexOf("item_key") + 1).value =
    "SEPARATE-ITEM";
  assert.equal((await parse()).length, 2);
  products.getRow(3).getCell(itemColumns.indexOf("item_key") + 1).value = "";
  products.spliceColumns(1, 2);
  rows = await parse();
  assert.equal(rows.length, 1);
  assert.ok(rows[0].sku);
  assert.ok(rows[0].item_key);
});

test("spreadsheet prices accept Egyptian formats and reject malformed or non-EGP values", async () => {
  const { spreadsheetEgp } = await import("../src/lib/spreadsheet-money");
  for (const value of [
    "1250",
    "1,250",
    "١٬٢٥٠",
    "۱۲۵۰",
    "EGP 1,250",
    "1,250 ج.م",
    "جنيه مصري ١٢٥٠",
    "1 250",
    "1\u00a0250",
    "١٬٢٥٠٫٠٠",
    "1.250,00",
  ])
    assert.equal(spreadsheetEgp(value, 2, "cost_price"), 125000, value);
  for (const value of [
    "1250.50",
    "1,250.50",
    "١٬٢٥٠٫٥٠",
    "1250,50",
    "1250.50 EGP",
  ])
    assert.equal(spreadsheetEgp(value, 2, "cost_price"), 125050, value);
  assert.equal(spreadsheetEgp("", 2, "cost_price", true), null);
  assert.equal(spreadsheetEgp("0", 2, "cost_price", true), 0);
  for (const value of [
    "-1250",
    "USD 1250",
    "12,34,56",
    "1 2",
    "1.001",
    "1e3",
    "EGP",
    "",
    "500abc",
  ])
    assert.throws(
      () => spreadsheetEgp(value, 2, "cost_price"),
      /Row 2: cost_price.*two decimal places/,
      value,
    );
  assert.equal(
    spreadsheetEgp("90071992547409.91", 2, "price"),
    Number.MAX_SAFE_INTEGER,
  );
  assert.throws(
    () => spreadsheetEgp("90071992547409.92", 2, "price"),
    /too large/,
  );
});

test("modern Excel imports cost and selling prices with separators, Arabic digits and currency labels", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const sheet = workbook.worksheets[0];
  sheet.addRow(
    (
      workbook.getWorksheet("Examples — copy to Products")!.getRow(2)
        .values as unknown[]
    ).slice(1),
  );
  const set = (key: string, value: string) => {
    sheet.getRow(2).getCell(itemColumns.indexOf(key as any) + 1).value = value;
  };
  set("cost_price", "١٬٢٥٠ ج.م");
  set("sale_price", "EGP 2,000");
  set("discount_price", "1,750.50");
  const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
  const [item] = await parseSpreadsheet(
    buffer.buffer as ArrayBuffer,
    "products.xlsx",
  );
  assert.equal(item.cost, 125000);
  assert.equal(item.price, 200000);
  assert.equal(item.sale, 175050);
});

test("modern Excel imports rich Arabic names, uppercase status, numeric price precision and https photo links", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const sheet = workbook.worksheets[0];
  sheet.addRow(
    (
      workbook.getWorksheet("Examples — copy to Products")!.getRow(2)
        .values as unknown[]
    ).slice(1),
  );
  const set = (key: string, value: unknown) => {
    sheet.getRow(2).getCell(itemColumns.indexOf(key as any) + 1).value =
      value as any;
  };
  set("name_ar", {
    richText: [{ text: "حساس حرارة " }, { text: "مياه ترموستات" }],
  });
  set("name_en", "");
  set("cost_price", 992.433070866142);
  set("sale_price", 1260.39);
  set("status", "Published");
  set("photos", "https://example.invalid/photo.webp");
  set("extra_data", "1.4 CC");
  const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
  const [item] = await parseSpreadsheet(
    buffer.buffer as ArrayBuffer,
    "products.xlsx",
  );
  assert.deepEqual(item.name, {
    ar: "حساس حرارة مياه ترموستات",
    en: "حساس حرارة مياه ترموستات",
  });
  assert.equal(item.cost, 99243);
  assert.equal(item.price, 126039);
  assert.equal(item.status, "published");
  assert.deepEqual(item.images, [
    {
      path: "https://example.invalid/photo.webp",
      alt: {
        ar: "حساس حرارة مياه ترموستات",
        en: "حساس حرارة مياه ترموستات",
      },
    },
  ]);
  item.slug = "rich-name-item";
  assert.equal(validateImport([item]).valid, true);
});

test("modern Excel photos accept uploaded image references, JSON arrays and multiple https links", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], []));
  const sheet = workbook.worksheets[0];
  sheet.addRow(
    (
      workbook.getWorksheet("Examples — copy to Products")!.getRow(2)
        .values as unknown[]
    ).slice(1),
  );
  const set = (value: string) => {
    sheet.getRow(2).getCell(itemColumns.indexOf("photos") + 1).value = value;
  };
  const parse = async () => {
    const buffer = new Uint8Array(await workbook.xlsx.writeBuffer());
    return (
      await parseSpreadsheet(buffer.buffer as ArrayBuffer, "products.xlsx")
    )[0];
  };
  set("00000000-0000-4000-8000-000000000201.jpg");
  assert.deepEqual((await parse()).images, [
    {
      path: "00000000-0000-4000-8000-000000000201.jpg",
      alt: { ar: "فلتر زيت — مثال فقط", en: "Oil filter — example only" },
    },
  ]);
  set(
    JSON.stringify([
      {
        path: "https://images.example.com/filter.webp",
        alt: { ar: "فلتر", en: "Filter" },
      },
    ]),
  );
  assert.deepEqual((await parse()).images, [
    {
      path: "https://images.example.com/filter.webp",
      alt: { ar: "فلتر", en: "Filter" },
    },
  ]);
  set("https://images.example.com/a.webp\nhttps://images.example.com/b.webp");
  assert.deepEqual(
    (await parse()).images?.map((image: { path: string }) => image.path),
    ["https://images.example.com/a.webp", "https://images.example.com/b.webp"],
  );
});

test("product export filters match make, model, year, photos, status and item brand", () => {
  const models = [
    { id: "opel-astra", brand: "opel", slug: "astra" },
    { id: "chevrolet-cruze", brand: "chevrolet", slug: "cruze" },
  ];
  const vehicles = [
    {
      id: "chevrolet-cruze-2022-0",
      brand: "chevrolet",
      model: "cruze",
      year: 2022,
      engine: "1.6",
      name: { ar: "كروز", en: "Cruze" },
    },
  ];
  const product = {
    ...demoProducts[0],
    manufacturer: "Bosch",
    status: "published",
    specs: { "car_years:opel-astra": "2020,2021" },
  };
  const matches = (
    query: string,
    context: { fitmentIds?: string[]; imageCount?: number } = {},
  ) =>
    matchesProductExportFilter(
      product,
      { imageCount: 2, ...context },
      { vehicles, models },
      parseProductExportFilter(new URLSearchParams(query)),
    );
  assert.equal(matches("make=opel"), true);
  assert.equal(matches("make=chevrolet"), false);
  assert.equal(matches("model=astra"), true);
  assert.equal(matches("model=cruze"), false);
  assert.equal(matches("year=2021"), true);
  assert.equal(matches("year=2022"), false);
  assert.equal(
    matches("year=2022", { fitmentIds: ["chevrolet-cruze-2022-0"] }),
    true,
  );
  assert.equal(matches("photo=yes"), true);
  assert.equal(matches("photo=no"), false);
  assert.equal(matches("photo=no", { imageCount: 0 }), true);
  assert.equal(matches("status=published"), true);
  assert.equal(matches("status=draft"), false);
  assert.equal(matches("brand=bosch"), true);
  assert.equal(matches("brand=brembo"), false);
  assert.equal(
    matchesProductExportFilter(
      { ...product, specs: {} },
      { fitmentIds: ["chevrolet-cruze-2022-0"], imageCount: 0 },
      { vehicles, models },
      parseProductExportFilter(new URLSearchParams("make=chevrolet&year=2022")),
    ),
    true,
  );
  assert.equal(
    parseProductExportFilter(new URLSearchParams("year=1800")).year,
    undefined,
  );
});

test("cleared SKU keeps the exported item_key identity instead of duplicating", async () => {
  const { default: ExcelJS } = await import("exceljs");
  const models = [
    {
      id: "opel-astra",
      brand: "opel",
      slug: "astra",
      name: { ar: "أسترا", en: "Astra" },
    },
  ];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportItemWorkbook([], [], models));
  const sheet = workbook.worksheets[0];
  sheet.addRow(
    (
      workbook.getWorksheet("Examples — copy to Products")!.getRow(2)
        .values as unknown[]
    ).slice(1),
  );
  const set = (field: string, value: string | number) => {
    sheet.getRow(2).getCell(itemColumns.indexOf(field as any) + 1).value =
      value;
  };
  set("car_make", "opel");
  set("car_model", "astra");
  set("start_year", 2020);
  set("end_year", 2021);
  const source = new Uint8Array(await workbook.xlsx.writeBuffer());
  const prepared = prepareItemRows(
    await parseSpreadsheet(source.buffer as ArrayBuffer, "items.xlsx"),
    models,
    [],
  )[0];
  prepared.id = "product-1";
  const exported = new ExcelJS.Workbook();
  await exported.xlsx.load(await exportItemWorkbook([prepared], [], models));
  const products = exported.worksheets[0];
  for (let n = 2; n <= products.rowCount; n++)
    products.getRow(n).getCell(itemColumns.indexOf("sku") + 1).value = null;
  const cleared = new Uint8Array(await exported.xlsx.writeBuffer());
  const parsed = await parseSpreadsheet(
    cleared.buffer as ArrayBuffer,
    "items.xlsx",
  );
  assert.equal(parsed[0].sku_automatic, true);
  const roundtrip = prepareItemRows(parsed, models, [prepared])[0];
  assert.equal(roundtrip.sku, prepared.sku);
  assert.equal(roundtrip.id, "product-1");
});
