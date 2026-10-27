import ExcelJS from "exceljs";
import { csvCell } from "./importer";
import type { Product } from "./catalog";
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
] as const;
type ExportProduct = Product & { vehicle_config_id?: string };
function exportValue(
  p: ExportProduct,
  c: (typeof columns)[number],
): string | number | boolean | null | undefined {
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
export async function exportXlsx(products: ExportProduct[]) {
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
      price: Number(values.price),
      sale: values.sale === "" ? null : Number(values.sale),
      partNumber: values.partNumber,
      demo: values.demo === "true",
      orderable: values.orderable === "true",
      status: values.status,
      specs: JSON.parse(values.specs || "{}"),
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
        ? { cost: values.cost === "" ? null : Number(values.cost) }
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
