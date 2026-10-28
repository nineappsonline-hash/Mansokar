import ExcelJS from "exceljs";
import { csvCell } from "./importer";
import type { Product, Vehicle } from "./catalog";
export const columns = [
  "sku",
  "slug",
  "name_ar",
  "name_en",
  "description_ar",
  "description_en",
  "manufacturer",
  "category",
  "family",
  "type",
  "price",
  "sale",
  "partNumber",
  "demo",
  "orderable",
  "status",
  "specs",
  "vehicle_config_id",
  "partNumbers",
  "synonyms",
  "cost",
  "warranty",
  "editorial",
  "seo",
  "policy_refs",
  "country_of_origin",
  "fitting_position",
  "fitment_notes_ar",
  "fitment_notes_en",
] as const;
type ExportProduct = Product & { vehicle_config_id?: string };
function exportValue(
  p: ExportProduct,
  c: (typeof columns)[number],
): string | number | boolean | null | undefined {
  if (c === "price" || c === "sale" || c === "cost") {
    const amount = p[c];
    return amount == null ? "" : amount / 100;
  }
  if (
    [
      "country_of_origin",
      "fitting_position",
      "fitment_notes_ar",
      "fitment_notes_en",
    ].includes(c)
  )
    return p.specs[c] ?? "";
  if (c === "name_ar") return p.name.ar;
  if (c === "name_en") return p.name.en;
  if (c === "description_ar") return p.description.ar;
  if (c === "description_en") return p.description.en;
  if (
    [
      "specs",
      "partNumbers",
      "synonyms",
      "warranty",
      "editorial",
      "seo",
      "policy_refs",
    ].includes(c)
  )
    return JSON.stringify(
      p[c as keyof Product] ??
        (
          {
            partNumbers: [],
            synonyms: { ar: [], en: [] },
            editorial: {},
            seo: {},
            policy_refs: [],
            specs: {},
          } as Record<string, unknown>
        )[c] ??
        null,
    );
  return p[c as keyof ExportProduct] as
    string | number | boolean | null | undefined;
}
export function exportCsv(products: ExportProduct[]) {
  return [
    columns.join(","),
    ...products.map((p) =>
      columns.map((c) => csvCell(exportValue(p, c))).join(","),
    ),
  ].join("\r\n");
}
export async function exportXlsx(
  products: ExportProduct[],
  vehicles: Vehicle[] = [],
) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  sheet.addRow([...columns]);
  for (const p of products)
    sheet.addRow(
      columns.map((c) => {
        const value = exportValue(p, c);
        return typeof value === "boolean" ? String(value) : (value ?? "");
      }),
    );
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((c) => {
    c.width = 24;
  });
  for (const key of ["price", "sale", "cost"] as const) {
    sheet.getColumn(columns.indexOf(key) + 1).numFmt = "0.00";
  }
  const guide = workbook.addWorksheet("Instructions");
  [
    ["Column", "How to fill it"],
    [
      "sku",
      "Unique product code. Existing SKUs are updated; new SKUs are added.",
    ],
    ["name_en / name_ar", "Product names in English and Arabic."],
    [
      "manufacturer",
      "Item brand. Use a brand already added in the admin Manufacturers section.",
    ],
    ["country_of_origin", "Country where the item was made, e.g. Germany."],
    ["fitting_position", "Where the part fits: front, rear, left, right, etc."],
    [
      "fitment_notes_ar / fitment_notes_en",
      "Public compatibility restrictions and exclusions. These notes do not establish fitment on their own.",
    ],
    ["cost", "Private cost price in EGP. Enter 125.50 for EGP 125.50."],
    ["price", "Selling / list price in EGP. Enter 200 for EGP 200."],
    [
      "sale",
      "Optional discounted selling price in EGP, less than price. Leave blank for no discount.",
    ],
    [
      "vehicle_config_id",
      "Copy an exact car ID from Vehicles. Repeat the product row with the same SKU for each compatible car.",
    ],
    [
      "status",
      "Use draft or published. New products should be reviewed as drafts.",
    ],
    [
      "Required fields",
      "Fill sku, slug (lowercase letters/numbers/hyphens), name_ar, name_en, description_ar, description_en, manufacturer, category (existing slug), family, price, partNumber. Set type to oem or aftermarket, demo to false, orderable to true or false, status to draft or published. Leave optional fields blank; specs can be {}.",
    ],
    [
      "Import",
      "Upload the Products sheet as the first sheet. Maximum 1000 rows and 1 MB. Validate before saving.",
    ],
  ].forEach((row) => guide.addRow(row));
  guide.getRow(1).font = { bold: true };
  guide.getColumn(1).width = 28;
  guide.getColumn(2).width = 110;
  const cars = workbook.addWorksheet("Vehicles");
  cars.addRow([
    "vehicle_config_id",
    "Car (English)",
    "Car (Arabic)",
    "brand",
    "model",
    "year",
    "generation",
    "engine",
    "engine_capacity_cc",
    "engine_code",
    "fuel_type",
    "forced_induction",
    "transmission",
    "body",
    "trim",
  ]);
  vehicles.forEach((v) =>
    cars.addRow([
      v.id,
      v.name.en,
      v.name.ar,
      v.brand,
      v.model,
      v.year,
      v.generation,
      v.engine,
      v.engineCapacity,
      v.engineCode,
      v.fuelType,
      v.forcedInduction,
      v.transmission,
      v.body,
      v.trim,
    ]),
  );
  cars.getRow(1).font = { bold: true };
  cars.columns.forEach((c) => {
    c.width = 60;
  });
  cars.views = [{ state: "frozen", ySplit: 1 }];
  return workbook.xlsx.writeBuffer();
}
export async function parseSpreadsheet(buffer: ArrayBuffer, filename: string) {
  const workbook = new ExcelJS.Workbook();
  if (filename.toLowerCase().endsWith(".xlsx"))
    validateZip(Buffer.from(buffer));
  if (filename.toLowerCase().endsWith(".xlsx"))
    await workbook.xlsx.load(buffer);
  else if (filename.toLowerCase().endsWith(".csv")) {
    const { Readable } = await import("node:stream");
    await workbook.csv.read(Readable.from([Buffer.from(buffer)]));
  } else throw Error("Use a CSV or XLSX template");
  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount > 1001)
    throw Error("Spreadsheet must contain 1–1000 product rows");
  const header = (sheet.getRow(1).values as unknown[]).slice(1).map(String);
  const required = columns.filter(
    (c) =>
      ![
        "partNumbers",
        "synonyms",
        "cost",
        "country_of_origin",
        "fitting_position",
        "fitment_notes_ar",
        "fitment_notes_en",
        "warranty",
        "editorial",
        "seo",
        "policy_refs",
      ].includes(c),
  );
  if (!required.every((c) => header.includes(c)))
    throw Error("Required columns: " + columns.join(", "));
  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const values: Record<string, string> = {};
    header.forEach((key, i) => {
      const value = row.getCell(i + 1).value;
      if (typeof value === "object" && value !== null)
        throw Error(`Row ${n}: formulas and rich cells are not supported`);
      values[key] = String(value ?? "");
    });
    rows.push({
      sku: values.sku,
      slug: values.slug,
      name: { ar: values.name_ar, en: values.name_en },
      description: { ar: values.description_ar, en: values.description_en },
      manufacturer: values.manufacturer,
      category: values.category,
      family: values.family,
      type: values.type,
      price: parseEgp(values.price, n, "price"),
      sale: values.sale === "" ? null : parseEgp(values.sale, n, "sale"),
      partNumber: values.partNumber,
      demo: values.demo === "true",
      orderable: values.orderable === "true",
      status: values.status,
      specs: {
        ...JSON.parse(values.specs || "{}"),
        ...Object.fromEntries(
          [
            "country_of_origin",
            "fitting_position",
            "fitment_notes_ar",
            "fitment_notes_en",
          ]
            .filter((key) => values[key] !== undefined)
            .map((key) => [key, values[key].trim()]),
        ),
      },
      ...Object.fromEntries(
        [
          "partNumbers",
          "synonyms",
          "warranty",
          "editorial",
          "seo",
          "policy_refs",
        ]
          .filter((k) => values[k] !== undefined && values[k] !== "")
          .map((k) => [k, JSON.parse(values[k])]),
      ),
      ...(values.cost !== undefined
        ? { cost: values.cost === "" ? null : parseEgp(values.cost, n, "cost") }
        : {}),
      ...(values.vehicle_config_id
        ? { fitments: [values.vehicle_config_id] }
        : {}),
    });
  });
  const grouped = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    const key = String(row.sku);
    const existing = grouped.get(key);
    if (existing) {
      const { fitments: a, ...baseA } = existing;
      const { fitments: b, ...baseB } = row;
      if (JSON.stringify(baseA) !== JSON.stringify(baseB))
        throw Error("Repeated SKU has conflicting product fields: " + key);
      existing.fitments = [
        ...new Set([...((a as string[]) ?? []), ...((b as string[]) ?? [])]),
      ];
    } else grouped.set(key, row);
  }
  return [...grouped.values()];
}

function parseEgp(value: string, row: number, field: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value?.trim() ?? ""))
    throw Error(
      `Row ${row}: ${field} must be an EGP amount with at most two decimal places`,
    );
  const amount = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(amount))
    throw Error(`Row ${row}: ${field} is too large`);
  return amount;
}

function validateZip(data: Buffer) {
  let end = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (data.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw Error("Invalid XLSX archive");
  const count = data.readUInt16LE(end + 10);
  let offset = data.readUInt32LE(end + 16),
    expanded = 0;
  if (count > 1000) throw Error("Spreadsheet contains too many files");
  for (let i = 0; i < count; i++) {
    if (offset + 46 > data.length || data.readUInt32LE(offset) !== 0x02014b50)
      throw Error("Invalid XLSX directory");
    if (data.readUInt16LE(offset + 8) & 1)
      throw Error("Encrypted spreadsheets are not supported");
    expanded += data.readUInt32LE(offset + 24);
    if (expanded > 20_000_000)
      throw Error("Expanded spreadsheet exceeds 20 MB");
    offset +=
      46 +
      data.readUInt16LE(offset + 28) +
      data.readUInt16LE(offset + 30) +
      data.readUInt16LE(offset + 32);
  }
}
