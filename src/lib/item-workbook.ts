import ExcelJS from "exceljs";
import { spreadsheetEgp } from "./spreadsheet-money";
import { randomUUID } from "node:crypto";
import type { Product, Vehicle } from "./catalog";
import { readApplications } from "./product-applications";
export const itemColumns = [
  "item_key",
  "sku",
  "name_ar",
  "name_en",
  "item_brand",
  "category",
  "country_of_origin",
  "cost_price",
  "sale_price",
  "discount_price",
  "part_number",
  "type",
  "warranty_months",
  "status",
  "orderable",
  "car_make",
  "car_model",
  "start_year",
  "end_year",
  "years",
  "vehicle_config_ids",
  "photos",
  "extra_data",
] as const;
type Model = {
  id: string;
  brand: string;
  slug: string;
  name: { ar: string; en: string };
};
export async function exportItemWorkbook(
  products: (Product & { fitments?: string[]; images?: unknown[] })[],
  vehicles: Vehicle[],
  models: Model[],
  categories: { slug: string; name: { ar: string; en: string } }[] = [],
  modelYears: { model_id: string; year: number }[] = [],
) {
  const book = new ExcelJS.Workbook(),
    sheet = book.addWorksheet("Products");
  sheet.addRow([...itemColumns]);
  for (const p of products) {
    let apps = readApplications(p.specs);
    if (!apps.length) {
      const groups = new Map<string, number[]>();
      for (const id of p.fitments || []) {
        const v = vehicles.find((v) => v.id === id),
          m = models.find((m) => m.brand === v?.brand && m.slug === v?.model);
        if (v && m)
          groups.set(m.id, [...new Set([...(groups.get(m.id) || []), v.year])]);
      }
      apps = [...groups].map(([model_id, years]) => ({ model_id, years }));
    }
    const entries = apps.length ? apps : [{ model_id: "", years: [] }];
    for (const [i, a] of entries.entries()) {
      const m = models.find((m) => m.id === a.model_id);
      const row: Record<string, unknown> = {
        item_key: p.sku,
        sku: p.sku,
        name_ar: p.name.ar,
        name_en: p.name.en,
        item_brand: p.manufacturer,
        category: p.category,
        country_of_origin: p.specs.country_of_origin || "",
        cost_price: p.cost == null ? "" : p.cost / 100,
        sale_price: p.price / 100,
        discount_price: p.sale == null ? "" : p.sale / 100,
        part_number: p.partNumber,
        type: p.type === "oem" ? "Original" : "After Market",
        warranty_months: p.specs.warranty_months || "",
        status: p.status,
        orderable: String(p.orderable),
        car_make: m?.brand || "",
        car_model: m?.slug || "",
        start_year:
          a.years.length &&
          Math.max(...a.years) - Math.min(...a.years) + 1 ===
            new Set(a.years).size
            ? Math.min(...a.years)
            : "",
        end_year:
          a.years.length &&
          Math.max(...a.years) - Math.min(...a.years) + 1 ===
            new Set(a.years).size
            ? Math.max(...a.years)
            : "",
        years:
          a.years.length &&
          Math.max(...a.years) - Math.min(...a.years) + 1 ===
            new Set(a.years).size
            ? ""
            : a.years.join(", "),
        vehicle_config_ids: i === 0 ? (p.fitments || []).join(", ") : "",
        photos: JSON.stringify(p.images || []),
        extra_data: JSON.stringify({
          specs: p.specs,
          description: p.description,
          seo: p.seo,
          editorial: p.editorial,
          warranty: p.warranty,
          partNumbers: p.partNumbers,
          synonyms: p.synonyms,
          policy_refs: p.policy_refs,
          category: p.category,
          family: p.family,
          demo: p.demo,
        }),
      };
      sheet.addRow(itemColumns.map((k) => row[k] as ExcelJS.CellValue));
    }
  }
  const examples = book.addWorksheet("Examples — copy to Products");
  examples.addRow([...itemColumns]);
  for (const [make, model, years] of [
    ["opel", "astra", "2020-2022"],
    ["chevrolet", "cruze", "2021, 2023"],
  ]) {
    const row: Record<string, string | number> = {
      item_key: "",
      sku: "",
      name_ar: "فلتر زيت — مثال فقط",
      name_en: "Oil filter — example only",
      item_brand: "Example Brand",
      category: "filters",
      country_of_origin: "Germany",
      cost_price: 500,
      sale_price: 750,
      part_number: "EXAMPLE-123",
      type: "After Market",
      warranty_months: 12,
      status: "draft",
      orderable: "false",
      car_make: make,
      car_model: model,
      start_year: make === "opel" ? 2015 : "",
      end_year: make === "opel" ? 2020 : "",
      years: make === "opel" ? "" : years,
    };
    examples.addRow(itemColumns.map((k) => row[k] ?? ""));
  }
  const guide = book.addWorksheet("Instructions");
  [
    ["Field / step", "Instructions — تعليمات"],
    [
      "Start",
      "Fill Products only. Examples are fictional format examples, NOT verified compatibility. Copy examples only after replacing all facts.",
    ],
    [
      "item_key",
      "Leave blank for new products: the system generates the key and SKU. Rows with the same part names, item brand, part number and type are combined automatically across cars. Optional: use different item_keys to keep otherwise identical items separate.",
    ],
    [
      "sku",
      "Leave blank for automatic SKU. Keep exported SKUs unchanged to update an item.",
    ],
    [
      "Automatic fields",
      "URL slug, descriptions and SEO are automatic. Choose a category slug from the Categories sheet; part family is automatic.",
    ],
    [
      "category",
      "Choose a category slug from the Categories sheet. Use the same category on every row for a product. Existing workbooks without this column remain supported.",
    ],
    [
      "name_ar / name_en",
      "Enter the spare-part name only. The shopper’s selected car name is added automatically; do not list other cars in the part name.",
    ],
    [
      "Cars",
      "Repeat the same part names, item brand, part number, type and item details on another row for each make/model. Leave item_key and SKU blank for new items; existing exported SKUs update items. Enter start_year and end_year (2015 and 2020 includes every year). For non-contiguous years use years instead (2021, 2023); do not mix both. Enter All in car_make for every saved make, in car_model for every model of the selected make, or in years for every saved year of each matched model. When car_make and car_model are both filled and all three year fields are blank, years defaults to All saved years. Blank lower-level fields alongside All also mean All. All never creates new makes, models or years; it uses only saved catalog options listed in Car models and Model years sheets. Models without matching saved years are skipped and counted in the preview. Missing explicit makes/models are created on confirmed import. Use existing codes or names to avoid duplicates.",
    ],
    [
      "Prices",
      "Enter Egyptian pounds: 750 means EGP 750. Formats like 1,250, EGP 1250 and ١٬٢٥٠ are accepted. Leave cost_price blank if unknown. sale_price is normal selling price; discount_price is optional and must be lower. cost_price is private.",
    ],
    [
      "warranty_months",
      "Number of supplier warranty months, e.g. 12. Leave blank if no verified period.",
    ],
    ["type", "Original or After Market."],
    [
      "item_brand",
      "Existing brands are reused. New brands are added on confirmed import.",
    ],
    [
      "Photos",
      "Optional JSON array of {path,alt:{ar,en}}, uploaded image paths from Uploaded photos, or https image links (one per line). Links use the product name as the image description if none is supplied. Embedded Excel pictures are not imported. You can also upload photos by drag/drop after import.",
    ],
    [
      "vehicle_config_ids",
      "Optional exact verified engine IDs, comma-separated. Broad make/model/year rows do not prove engine-specific fit.",
    ],
    [
      "extra_data",
      "Advanced export round-trip data. Leave blank on new items. Existing fields are preserved when updating.",
    ],
    [
      "Review",
      "Upload, Check file, then Import checked products. Examples sheet is never imported. Maximum 1000 product rows, 1 MB.",
    ],
    [
      "Privacy",
      "All fitment rows remain admin data. Public pages display only the current car context.",
    ],
  ].forEach((r) => guide.addRow(r));
  const categorySheet = book.addWorksheet("Categories");
  categorySheet.addRow(["category", "Arabic name", "English name"]);
  categories.forEach((category) =>
    categorySheet.addRow([category.slug, category.name.ar, category.name.en]),
  );
  const cars = book.addWorksheet("Car models");
  cars.addRow(["car_make", "car_model", "English model", "Arabic model"]);
  models.forEach((m) => cars.addRow([m.brand, m.slug, m.name.en, m.name.ar]));
  const yearsSheet = book.addWorksheet("Model years");
  yearsSheet.addRow(["car_make", "car_model", "year"]);
  modelYears.forEach((entry) => {
    const model = models.find((item) => item.id === entry.model_id);
    if (model) yearsSheet.addRow([model.brand, model.slug, entry.year]);
  });
  const configs = book.addWorksheet("Vehicles");
  configs.addRow([
    "vehicle_config_id",
    "Car",
    "make",
    "model",
    "year",
    "engine",
  ]);
  vehicles.forEach((v) =>
    configs.addRow([v.id, v.name.en, v.brand, v.model, v.year, v.engine]),
  );
  const photos = book.addWorksheet("Uploaded photos");
  photos.addRow(["sku", "path", "Arabic description", "English description"]);
  products.forEach((p) =>
    (p.images || []).forEach((image: any) =>
      photos.addRow([p.sku, image.path, image.alt?.ar, image.alt?.en]),
    ),
  );
  for (const s of book.worksheets) {
    s.views = [{ state: "frozen", ySplit: 1 }];
    s.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    s.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF203039" },
    };
    s.columns.forEach((c) => (c.width = 25));
    s.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: s.columnCount },
    };
  }
  guide.getColumn(2).width = 115;
  sheet.getColumn(itemColumns.indexOf("extra_data") + 1).hidden = true;
  examples.getColumn(itemColumns.indexOf("extra_data") + 1).hidden = true;
  for (const s of [sheet, examples])
    for (const key of ["cost_price", "sale_price", "discount_price"])
      s.getColumn(itemColumns.indexOf(key as any) + 1).numFmt = "0";
  return book.xlsx.writeBuffer();
}
export function spreadsheetCellText(
  value: ExcelJS.CellValue,
  row: number,
): string {
  if (value == null) return "";
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return String(value);
  const cell = value as Record<string, any>;
  if (Array.isArray(cell.richText))
    return cell.richText.map((part: any) => part?.text ?? "").join("");
  if ("formula" in cell || "sharedFormula" in cell)
    throw Error(`Row ${row}: formulas are unsupported`);
  if (typeof cell.text === "string") return cell.text;
  if (cell.error)
    throw Error(`Row ${row}: cell contains Excel error ${cell.error}`);
  throw Error(`Row ${row}: unsupported cell content`);
}
function optionalJson(
  value: string,
  row: number,
  field: string,
  prefix: string,
) {
  if (!value || !value.startsWith(prefix)) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    throw Error(`Row ${row}: ${field} must be valid JSON`);
  }
}
function photoAlt(value: unknown, fallback: { ar: string; en: string }) {
  const alt = (value ?? {}) as { ar?: unknown; en?: unknown };
  const ar = typeof alt.ar === "string" ? alt.ar.trim() : "";
  const en = typeof alt.en === "string" ? alt.en.trim() : "";
  return {
    ar: ar || en || fallback.ar,
    en: en || ar || fallback.en,
  };
}
function parsePhotos(
  value: string,
  row: number,
  fallbackAlt: { ar: string; en: string },
) {
  if (!value) return undefined;
  let entries: unknown[];
  if (value.startsWith("[")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw Error(`Row ${row}: photos must be valid JSON`);
    }
    if (!Array.isArray(parsed))
      throw Error(`Row ${row}: photos must be a JSON array`);
    entries = parsed;
  } else entries = value.split(/\r?\n/).map((line) => line.trim());
  entries = entries.filter(
    (entry) => typeof entry !== "string" || entry.trim(),
  );
  if (!entries.length) return undefined;
  return entries.map((entry) => {
    if (typeof entry === "string")
      return { path: entry.trim(), alt: fallbackAlt };
    if (
      !entry ||
      typeof entry !== "object" ||
      typeof (entry as { path?: unknown }).path !== "string" ||
      !(entry as { path: string }).path.trim()
    )
      throw Error(
        `Row ${row}: photos must contain uploaded paths or https image links`,
      );
    return {
      path: (entry as { path: string }).path.trim(),
      alt: photoAlt((entry as { alt?: unknown }).alt, fallbackAlt),
    };
  });
}
export function parseYears(text: string, row: number) {
  const result = new Set<number>();
  for (const part of text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const match = part.match(/^(\d{4})(?:\s*[-–]\s*(\d{4}))?$/);
    if (!match) throw Error(`Row ${row}: use years like 2020-2022, 2024`);
    const from = Number(match[1]),
      to = Number(match[2] || match[1]);
    if (from < 1950 || to > 2100 || to < from)
      throw Error(`Row ${row}: invalid year range`);
    for (let y = from; y <= to; y++) result.add(y);
  }
  return [...result].sort((a, b) => a - b);
}
export function parseItemSheet(sheet: ExcelJS.Worksheet) {
  const headers = (sheet.getRow(1).values as unknown[]).slice(1).map(String),
    groups = new Map<string, any>();
  for (const key of [
    "name_ar",
    "name_en",
    "item_brand",
    "sale_price",
    "part_number",
  ])
    if (!headers.includes(key)) throw Error("Missing column: " + key);
  sheet.eachRow((row, n) => {
    if (n === 1) return;
    const v: Record<string, string> = {};
    const raw: Record<string, ExcelJS.CellValue> = {};
    headers.forEach((h, i) => {
      const cell = row.getCell(i + 1).value;
      raw[h] = cell;
      v[h] = spreadsheetCellText(cell, n).trim();
    });
    if (Object.values(v).every((x) => !x)) return;
    const normalizeIdentity = (text: string) =>
      text.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
    // Car applications never form part of item identity. Blank identifiers are
    // grouped by the same part name, manufacturer, part number and item type.
    const key = v.sku
      ? `sku:${v.sku}`
      : v.item_key
        ? `key:${v.item_key}`
        : `auto:${JSON.stringify(
            [
              v.name_ar,
              v.name_en,
              v.item_brand,
              v.part_number,
              (v.type || "aftermarket")
                .toLowerCase()
                .replace(/\s/g, "")
                .replace(/^oem$/, "original"),
            ].map(normalizeIdentity),
          )}`;
    const amount = (field: string, optional = false) => {
      const value = raw[field];
      const text =
        typeof value === "number"
          ? String(Math.round(value * 100) / 100)
          : v[field] || "";
      return spreadsheetEgp(text, n, field, optional);
    };
    const type = v.type?.toLowerCase().replace(/\s/g, "") || "aftermarket";
    if (!["original", "oem", "aftermarket"].includes(type))
      throw Error(`Row ${n}: type must be Original or After Market`);
    const months = v.warranty_months ? Number(v.warranty_months) : null;
    if (
      months !== null &&
      (!Number.isInteger(months) || months < 1 || months > 600)
    )
      throw Error(`Row ${n}: warranty_months must be 1–600`);
    const extra = optionalJson(v.extra_data, n, "extra_data", "{") ?? {};
    const name = { ar: v.name_ar, en: v.name_en || v.name_ar };
    const photos = parsePhotos(v.photos, n, name);
    const spec = {
      ...extra.specs,
      country_of_origin: v.country_of_origin || "",
      warranty_months: months === null ? "" : String(months),
    };
    const common = {
      name,
      manufacturer: v.item_brand,
      category: v.category || extra.category || "",
      price: amount("sale_price"),
      cost: amount("cost_price", true),
      sale: amount("discount_price", true),
      partNumber: v.part_number,
      type: type === "aftermarket" ? "aftermarket" : "oem",
      status: (v.status || "draft").toLowerCase(),
      orderable:
        v.orderable === "" || v.orderable === undefined
          ? true
          : v.orderable === "true",
      demo: extra.demo ?? false,
      specs: spec,
      warranty:
        months === null
          ? (extra.warranty ?? null)
          : {
              ar: `ضمان المورد ${months} شهر حسب شروط المنتج.`,
              en: `${months}-month supplier warranty subject to product terms.`,
            },
      ...(photos ? { images: photos } : {}),
    };
    const entry = groups.get(key);
    if (entry && JSON.stringify(entry._common) !== JSON.stringify(common))
      throw Error(
        `Row ${n}: repeated item has conflicting details: ${v.sku || v.item_key || v.part_number || v.name_en}`,
      );
    const all = (value: string) => value.trim().toLowerCase() === "all";
    const yearFields = [v.years, v.start_year, v.end_year];
    if (yearFields.some((value) => /\ball\b/i.test(value || "") && !all(value)))
      throw Error(
        `Row ${n}: use All by itself for car years, or enter specific years`,
      );
    const yearAll = yearFields.some((value) => all(value || "")) || Boolean(v.car_make && v.car_model && yearFields.every((value) => !value));
    if (
      yearAll &&
      [v.years, v.start_year, v.end_year].some((value) => value && !all(value))
    )
      throw Error(
        `Row ${n}: use All by itself for car years, or enter specific years`,
      );
    if (
      !yearAll &&
      (v.start_year || v.end_year) &&
      (!v.start_year || !v.end_year || v.years)
    )
      throw Error(
        `Row ${n}: fill both start_year and end_year, and leave years blank`,
      );
    if (
      !yearAll &&
      v.start_year &&
      (!/^\d{4}$/.test(v.start_year) || !/^\d{4}$/.test(v.end_year))
    )
      throw Error(`Row ${n}: start_year and end_year must be four-digit years`);
    const hasAll = all(v.car_make || "") || all(v.car_model || "") || yearAll;
    const app =
      v.car_make || v.car_model || v.years || v.start_year || v.end_year
        ? {
            make: v.car_make || (hasAll ? "All" : ""),
            model: v.car_model || (hasAll ? "All" : ""),
            years:
              yearAll || (hasAll && !v.years && !v.start_year && !v.end_year)
                ? ("all" as const)
                : parseYears(
                    v.start_year ? `${v.start_year}-${v.end_year}` : v.years,
                    n,
                  ),
          }
        : null;
    if (
      app &&
      (!app.make ||
        !app.model ||
        (Array.isArray(app.years) && !app.years.length))
    )
      throw Error(
        `Row ${n}: fill car_make, car_model and start_year/end_year (or years) together`,
      );
    const ids = v.vehicle_config_ids
      ? v.vehicle_config_ids
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    if (entry) {
      if (app) entry.applications_input.push(app);
      entry.fitments = [...new Set([...entry.fitments, ...ids])];
    } else {
      const sku =
        v.sku ||
        "MS-" + randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase();
      groups.set(key, {
        ...extra,
        ...common,
        sku,
        sku_automatic: !v.sku,
        item_key: v.item_key || sku,
        slug: extra.slug || "",
        family: extra.family || sku,
        category: common.category,
        description: extra.description || name,
        spreadsheet: true,
        applications_input: app ? [app] : [],
        fitments: ids,
        _common: common,
      });
    }
  });
  return [...groups.values()].map(({ _common, ...row }) => row);
}
