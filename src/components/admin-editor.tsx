"use client";
import { useState } from "react";
import { emptyImportMessage, importFeedback } from "@/lib/import-feedback";
import { ApiForm } from "./forms";
import uploadStyles from "./product-upload.module.css";
import { moveProductPhoto, validateProductPhotos } from "@/lib/product-photo-order";
export function JsonEditor({
  action,
  initial,
  label = "Save",
  title,
}: {
  action: string;
  initial: unknown;
  label?: string;
  title: string;
}) {
  const [value, setValue] = useState(JSON.stringify(initial, null, 2));
  return (
    <div className="panel stack">
      <h2>{title}</h2>
      <ApiForm action={action} label={label}>
        <label>
          JSON · bilingual fields / integer piasters
          <textarea
            className="code-editor"
            name="json"
            rows={15}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
          />
        </label>
      </ApiForm>
    </div>
  );
}
export function Importer({
  carBrands = [],
  carModels = [],
  itemBrands = [],
  years = [],
}: {
  carBrands?: { slug: string; name: string }[];
  carModels?: {
    slug: string;
    brand: string;
    name: { ar: string; en: string };
  }[];
  itemBrands?: string[];
  years?: number[];
}) {
  const [json, setJson] = useState("[]");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [validated, setValidated] = useState(false);
  const [filters, setFilters] = useState({
    make: "",
    model: "",
    year: "",
    photo: "",
    status: "",
    brand: "",
  });
  const update = (v: string) => {
    setJson(v);
    setValidated(false);
  };
  const setFilter = (key: keyof typeof filters, value: string) =>
    setFilters((previous) => {
      const next = { ...previous, [key]: value };
      if (
        key === "make" &&
        value &&
        !carModels.some(
          (model) => model.brand === value && model.slug === previous.model,
        )
      )
        next.model = "";
      return next;
    });
  const exportParams = new URLSearchParams({ format: "xlsx" });
  for (const [key, value] of Object.entries(filters))
    if (value) exportParams.set(key, value);
  const csvParams = new URLSearchParams(exportParams);
  csvParams.delete("format");
  const modelOptions = carModels
    .filter((model) => !filters.make || model.brand === filters.make)
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
  const brandName = (slug: string) =>
    carBrands.find((brand) => brand.slug === slug)?.name || slug;
  async function submit(commit: boolean) {
    setBusy(true);
    setMessage(
      commit
        ? "Importing checked products…"
        : "Reading and checking your file…",
    );
    if (!commit) setValidated(false);
    try {
      let checkedJson = json;
      if (!commit && file) {
        if (file.size > 1_000_000) throw Error("Maximum file size is 1 MB");
        const upload = new FormData();
        upload.append("file", file);
        const parsed = await fetch("/api/admin-file", {
          method: "POST",
          body: upload,
        });
        const result = await parsed.json();
        if (!parsed.ok) throw Error(importFeedback(result));
        checkedJson = JSON.stringify(result.rows, null, 2);
        setJson(checkedJson);
      }
      const rows = JSON.parse(checkedJson);
      if (!Array.isArray(rows) || !rows.length) throw Error(emptyImportMessage);
      const response = await fetch(
        "/api/admin-import" + (commit ? "" : "-preview"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ json: checkedJson }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw Error(importFeedback(data));
      setMessage(data.message);
      setValidated(!commit);
    } catch (error) {
      setValidated(false);
      setMessage(
        error instanceof SyntaxError
          ? "The product data could not be read. Select your Excel file again, or correct the advanced JSON data."
          : error instanceof Error
            ? error.message
            : "Import failed",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel stack">
      <h2>Import and export products with Excel</h2>
      <p className="muted">
        Download the Excel template and follow its Examples and Instructions
        sheets. Fill the Products worksheet; rows in Examples are not imported.
        Leave both SKU and item_key blank for new products; both are automatic.
        For multiple cars, repeat the same part names, item brand, part number,
        type and item details on each car row. Enter start_year and end_year
        (both included); missing cars are created on confirmed import. Warranty
        is entered once in months. Prices are in Egyptian pounds. SKU, URL,
        descriptions and SEO are automatic. Exported SKUs update existing items.
        Photos may use existing upload references or https image links; you can
        also drag and drop new pictures after importing.
      </p>
      <a
        className="button secondary"
        href="/api/admin-export?format=xlsx&template=true"
      >
        Download Excel import template ↗
      </a>
      <fieldset
        className="stack"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 6,
          gap: 12,
          padding: 16,
        }}
      >
        <legend>Export filters</legend>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          }}
        >
          <label>
            Car make
            <select
              value={filters.make}
              onChange={(e) => setFilter("make", e.target.value)}
            >
              <option value="">All makes</option>
              {carBrands.map((brand) => (
                <option key={brand.slug} value={brand.slug}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Car model
            <select
              value={filters.model}
              onChange={(e) => setFilter("model", e.target.value)}
            >
              <option value="">All models</option>
              {modelOptions.map((model) => (
                <option key={`${model.brand}-${model.slug}`} value={model.slug}>
                  {filters.make
                    ? model.name.en
                    : `${brandName(model.brand)} ${model.name.en}`}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <select
              value={filters.year}
              onChange={(e) => setFilter("year", e.target.value)}
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Photos
            <select
              value={filters.photo}
              onChange={(e) => setFilter("photo", e.target.value)}
            >
              <option value="">All products</option>
              <option value="yes">With photos</option>
              <option value="no">Without photos</option>
            </select>
          </label>
          <label>
            Status
            <select
              value={filters.status}
              onChange={(e) => setFilter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="published">Active (published)</option>
              <option value="draft">Draft</option>
            </select>
          </label>
          <label>
            Item brand
            <select
              value={filters.brand}
              onChange={(e) => setFilter("brand", e.target.value)}
            >
              <option value="">All brands</option>
              {itemBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="muted" style={{ margin: 0 }}>
          Filters choose which products are exported. Every matching product
          keeps all of its car applications, so importing the file back does not
          remove fitments or create duplicate products.
        </p>
        <div className="admin-nav" style={{ margin: 0 }}>
          <a className="button" href={`/api/admin-export?${exportParams}`}>
            Export filtered XLSX ↗
          </a>
          <a className="text-link" href={`/api/admin-export?${csvParams}`}>
            Legacy CSV export ↗
          </a>
          <button
            className="button secondary"
            type="button"
            onClick={() =>
              setFilters({
                make: "",
                model: "",
                year: "",
                photo: "",
                status: "",
                brand: "",
              })
            }
          >
            Clear filters
          </button>
        </div>
      </fieldset>
      <label>
        CSV / XLSX (max 1 MB)
        <input
          type="file"
          accept=".csv,.xlsx"
          disabled={busy}
          onChange={(e) => {
            const selected = e.target.files?.[0] || null;
            setFile(selected);
            update("[]");
            setMessage(
              selected
                ? `${selected.name} selected. Click Check file to read and validate its products.`
                : "",
            );
          }}
        />
      </label>
      <details>
        <summary>Advanced: review parsed spreadsheet data</summary>
        <label>
          Imported product rows
          <textarea
            className="code-editor"
            rows={16}
            value={json}
            disabled={busy}
            onChange={(e) => {
              setFile(null);
              update(e.target.value);
              setMessage("Product data changed. Click Check file again.");
            }}
          />
        </label>
      </details>
      <div className="admin-nav">
        <button
          className="button secondary"
          disabled={busy || (!file && json.trim() === "[]")}
          onClick={() => submit(false)}
        >
          {busy && !validated ? "Checking…" : "Check file"}
        </button>
        <button
          className="button"
          disabled={busy || !validated}
          onClick={() => submit(true)}
        >
          Import checked products
        </button>
      </div>
      <p role="status" className="prose" style={{ whiteSpace: "pre-wrap" }}>
        {message}
      </p>
    </div>
  );
}
export function ImageUpload() {
  const [message, setMessage] = useState("");
  return (
    <div className="panel stack">
      <h2>Catalog image upload</h2>
      <p>
        JPEG, PNG or WebP up to 5 MB. Images are decoded, resized, stripped of
        metadata and stored in a private bucket. Use the returned path in
        ordered image metadata.
      </p>
      <input
        aria-label="Product image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const form = new FormData();
            form.append("image", file);
            const response = await fetch("/api/upload?kind=catalog", {
              method: "POST",
              body: form,
            });
            const result = await response.json();
            if (!response.ok) throw Error(result.error);
            setMessage("Image path: " + result.path);
          } catch (error) {
            setMessage(
              error instanceof Error ? error.message : "Upload failed",
            );
          }
        }}
      />
      <p role="status">{message}</p>
    </div>
  );
}

export function ProductEditor({
  initial,
  manufacturers,
  categories,
}: {
  initial: Record<string, any>;
  manufacturers: string[];
  categories: { slug: string; name: { en: string } }[];
}) {
  const [value, setValue] = useState(initial);
  const field = (key: string, label: string, type = "text") => (
    <label key={key}>
      {label}
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        value={
          type === "number" && value[key] != null
            ? value[key] / 100
            : (value[key] ?? "")
        }
        onChange={(e) =>
          setValue({
            ...value,
            [key]:
              type === "number"
                ? e.target.value === ""
                  ? null
                  : Math.round(Number(e.target.value) * 100)
                : e.target.value,
          })
        }
      />
    </label>
  );
  return (
    <section className="panel stack">
      <h2>{value.id ? "Edit product" : "New product"}</h2>
      <ApiForm
        action="admin-product"
        label="Save product"
        extra={{ json: JSON.stringify(value) }}
      >
        {field("sku", "SKU")}
        {field("slug", "URL slug")}
        {(["name", "description", "warranty"] as const).flatMap((key) =>
          (["en", "ar"] as const).map((lang) => (
            <label key={key + lang}>
              {key} · {lang}
              <textarea
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={value[key]?.[lang] ?? ""}
                onChange={(e) => {
                  const next = {
                    ...(value[key] ?? { en: "", ar: "" }),
                    [lang]: e.target.value,
                  };
                  setValue({
                    ...value,
                    [key]:
                      key === "warranty" && !next.en && !next.ar ? null : next,
                  });
                }}
              />
            </label>
          )),
        )}
        <label>
          Item brand / manufacturer
          <select
            value={value.manufacturer}
            onChange={(e) =>
              setValue({ ...value, manufacturer: e.target.value })
            }
          >
            {manufacturers.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label>
          Category
          <select
            value={value.category}
            onChange={(e) => setValue({ ...value, category: e.target.value })}
          >
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name.en}
              </option>
            ))}
          </select>
        </label>
        <label>
          Country of origin
          <input
            value={value.specs?.country_of_origin ?? ""}
            onChange={(e) =>
              setValue({
                ...value,
                specs: { ...value.specs, country_of_origin: e.target.value },
              })
            }
          />
        </label>
        <fieldset className="stack">
          <legend>Product compatibility details</legend>
          <label>
            Fitting position
            <select
              value={value.specs?.fitting_position ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  specs: { ...value.specs, fitting_position: e.target.value },
                })
              }
            >
              <option value="">Not supplied</option>
              {[
                "front",
                "rear",
                "front left",
                "front right",
                "rear left",
                "rear right",
                "left",
                "right",
                "engine bay",
                "cabin",
                "other",
              ].map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
              {value.specs?.fitting_position &&
                ![
                  "front",
                  "rear",
                  "front left",
                  "front right",
                  "rear left",
                  "rear right",
                  "left",
                  "right",
                  "engine bay",
                  "cabin",
                  "other",
                ].includes(value.specs.fitting_position) && (
                  <option value={value.specs.fitting_position}>
                    {value.specs.fitting_position}
                  </option>
                )}
            </select>
          </label>
          {(["ar", "en"] as const).map((lang) => (
            <label key={lang}>
              Compatibility restrictions / exclusions · {lang}
              <textarea
                maxLength={1000}
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={value.specs?.[`fitment_notes_${lang}`] ?? ""}
                onChange={(e) =>
                  setValue({
                    ...value,
                    specs: {
                      ...value.specs,
                      [`fitment_notes_${lang}`]: e.target.value,
                    },
                  })
                }
              />
            </label>
          ))}
          <p className="muted">
            Public buying notes, for example front only or not suitable for a
            specified engine. Select the verified configurations in Compatible
            vehicles after saving the product.
          </p>
        </fieldset>
        <fieldset className="stack">
          <legend>Verified listing data · optional</legend>
          <p className="muted">
            Stock quantity starts at 1,000 for current catalog products. Update
            it here when your count changes; checkout orderability is controlled
            separately.
          </p>
          <label>
            Stock quantity
            <input
              type="number"
              min="0"
              step="1"
              value={value.specs?.stock_quantity ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  specs: { ...value.specs, stock_quantity: e.target.value },
                })
              }
            />
          </label>
          <label>
            Stock status
            <select
              value={value.specs?.stock_status ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  specs: { ...value.specs, stock_status: e.target.value },
                })
              }
            >
              <option value="">Unknown / not verified</option>
              <option value="in_stock">In stock</option>
              <option value="out_of_stock">Out of stock</option>
              <option value="preorder">Preorder</option>
              <option value="backorder">Backorder</option>
            </select>
          </label>
          <label>
            Product condition
            <select
              value={value.specs?.product_condition ?? value.condition ?? ""}
              onChange={(e) =>
                setValue({
                  ...value,
                  specs: { ...value.specs, product_condition: e.target.value },
                })
              }
            >
              <option value="">Unknown</option>
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </label>
        </fieldset>
        <fieldset className="stack">
          <legend>SEO and search terms · optional</legend>
          <p className="muted">
            Titles and descriptions are generated automatically. Enable an
            override only when you need custom editorial copy.
          </p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={value.seo?.manual === true}
              onChange={(e) =>
                setValue({
                  ...value,
                  seo: { ...value.seo, manual: e.target.checked },
                })
              }
            />{" "}
            Use custom search titles and descriptions
          </label>
          {(["ar", "en"] as const).flatMap((lang) => [
            <label key={`title-${lang}`}>
              Search title · {lang}
              <input
                maxLength={200}
                disabled={!value.seo?.manual}
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={value.seo?.title?.[lang] ?? ""}
                onChange={(e) =>
                  setValue({
                    ...value,
                    seo: {
                      ...value.seo,
                      title: {
                        ar: "",
                        en: "",
                        ...value.seo?.title,
                        [lang]: e.target.value,
                      },
                    },
                  })
                }
              />
            </label>,
            <label key={`description-${lang}`}>
              Search description · {lang}
              <textarea
                maxLength={500}
                disabled={!value.seo?.manual}
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={value.seo?.description?.[lang] ?? ""}
                onChange={(e) =>
                  setValue({
                    ...value,
                    seo: {
                      ...value.seo,
                      description: {
                        ar: "",
                        en: "",
                        ...value.seo?.description,
                        [lang]: e.target.value,
                      },
                    },
                  })
                }
              />
            </label>,
            <label key={`synonyms-${lang}`}>
              Alternative names / search terms · {lang} (one per line)
              <textarea
                dir={lang === "ar" ? "rtl" : "ltr"}
                value={(value.synonyms?.[lang] ?? []).join("\n")}
                onChange={(e) =>
                  setValue({
                    ...value,
                    synonyms: {
                      ar: [],
                      en: [],
                      ...value.synonyms,
                      [lang]: e.target.value
                        .split("\n")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </label>,
          ])}
          <p className="muted">
            Leave search titles and descriptions blank to use the automatic
            product-specific text. Alternative names help shoppers find the
            part.
          </p>
        </fieldset>
        {field("family", "Part family")}
        {field("partNumber", "Primary part number")}
        <label>
          Additional part numbers (one per line)
          <textarea
            value={(value.partNumbers ?? []).join("\n")}
            onChange={(e) =>
              setValue({
                ...value,
                partNumbers: e.target.value.split("\n").filter(Boolean),
              })
            }
          />
        </label>
        {field("price", "Selling / list price · EGP", "number")}
        {field(
          "sale",
          "Discounted sale price · EGP (blank to disable)",
          "number",
        )}
        {field("cost", "Private cost · EGP", "number")}
        <label>
          Type
          <select
            value={value.type}
            onChange={(e) => setValue({ ...value, type: e.target.value })}
          >
            <option value="oem">OEM</option>
            <option value="aftermarket">After Market</option>
          </select>
        </label>
        <label>
          Status
          <select
            value={value.status}
            onChange={(e) => setValue({ ...value, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        {["demo", "orderable"].map((key) => (
          <label className="check" key={key}>
            <input
              type="checkbox"
              checked={Boolean(value[key])}
              onChange={(e) => setValue({ ...value, [key]: e.target.checked })}
            />
            {key}
          </label>
        ))}
      </ApiForm>
      {value.id && (
        <button
          className="button secondary"
          onClick={() =>
            setValue({
              ...value,
              id: undefined,
              sku: value.sku + "-COPY",
              slug: value.slug + "-copy",
              status: "draft",
              orderable: false,
            })
          }
        >
          Duplicate as draft
        </button>
      )}
      <details>
        <summary>Advanced product fields</summary>
        <JsonEditor
          title="Specifications, synonyms, editorial and SEO"
          action="admin-product"
          initial={value}
        />
      </details>
    </section>
  );
}

export function FitmentEditor({
  products,
  vehicles,
  fitments,
  initialProduct,
}: {
  initialProduct?: string;
  products: { id: string; sku: string }[];
  vehicles: { id: string; name: { en: string } }[];
  fitments: { product_id: string; vehicle_config_id: string }[];
}) {
  const [product, setProduct] = useState(
    initialProduct ?? products[0]?.id ?? "",
  );
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(
    fitments
      .filter((f) => f.product_id === product)
      .map((f) => f.vehicle_config_id),
  );
  return (
    <section className="panel stack">
      <h2>Compatible vehicles · exact configurations</h2>
      <p className="muted">
        Select only configurations verified for this part number. Save fitting
        position and exclusions in the product fields above. Unselected vehicles
        remain unconfirmed.
      </p>
      <a className="text-link" href="/admin?module=vehicles">
        Add or edit vehicle configurations ↗
      </a>
      <label>
        Product
        <select
          value={product}
          onChange={(e) => {
            setProduct(e.target.value);
            setSelected(
              fitments
                .filter((f) => f.product_id === e.target.value)
                .map((f) => f.vehicle_config_id),
            );
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku}
            </option>
          ))}
        </select>
      </label>
      <label>
        Find vehicle
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <p>
        {selected.length} exact configurations selected. Unselected
        configurations are unconfirmed.
      </p>
      <ApiForm
        action="admin-fitments"
        label="Save exact fitments"
        extra={{ product, vehicles: selected }}
      >
        <div className="admin-list">
          {vehicles
            .filter((v) =>
              v.name.en.toLowerCase().includes(query.toLowerCase()),
            )
            .map((v) => (
              <label className="check" key={v.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(v.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, v.id]
                        : selected.filter((id) => id !== v.id),
                    )
                  }
                />
                {v.name.en}
              </label>
            ))}
        </div>
      </ApiForm>
    </section>
  );
}

export type MerchantField = {
  path: string;
  label: string;
  type?:
    "text" | "textarea" | "number" | "checkbox" | "datetime-local" | "select";
  options?: { value: string; label: string }[];
  nullable?: boolean;
  required?: boolean;
};
export function MerchantForm({
  title,
  action,
  initial,
  fields,
}: {
  title: string;
  action: string;
  initial: Record<string, any>;
  fields: MerchantField[];
}) {
  const [value, setValue] = useState(initial);
  const get = (path: string) =>
    path.split(".").reduce<any>((node, key) => node?.[key], value);
  const set = (path: string, next: unknown) => {
    const copy = structuredClone(value);
    const keys = path.split(".");
    let node = copy;
    for (const key of keys.slice(0, -1)) node = node[key] ??= {};
    node[keys.at(-1)!] = next;
    setValue(copy);
  };
  return (
    <section className="panel stack">
      <h2>{title}</h2>
      <ApiForm
        action={action}
        label="Save"
        extra={{ json: JSON.stringify(value) }}
      >
        <div className="merchant-form-fields">
          {fields.map((field) => {
            const current = get(field.path);
            return (
              <label
                key={field.path}
                className={field.type === "checkbox" ? "check" : undefined}
              >
                {field.label}
                {field.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(current)}
                    onChange={(e) => set(field.path, e.target.checked)}
                  />
                ) : field.type === "textarea" ? (
                  <textarea
                    rows={field.path.startsWith("body.") ? 10 : 4}
                    dir={field.path.endsWith(".ar") ? "rtl" : "ltr"}
                    value={current ?? ""}
                    required={field.required}
                    onChange={(e) => set(field.path, e.target.value)}
                  />
                ) : field.type === "select" ? (
                  <select
                    value={current ?? ""}
                    onChange={(e) => set(field.path, e.target.value || null)}
                  >
                    {field.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    dir={field.path.endsWith(".ar") ? "rtl" : "ltr"}
                    required={field.required}
                    min={field.type === "number" ? 0 : undefined}
                    value={
                      field.type === "datetime-local"
                        ? (current?.slice(0, 16) ?? "")
                        : (current ?? "")
                    }
                    onChange={(e) =>
                      set(
                        field.path,
                        field.type === "number"
                          ? e.target.value === "" && field.nullable
                            ? null
                            : Number(e.target.value)
                          : field.type === "datetime-local"
                            ? e.target.value
                              ? new Date(e.target.value + "Z").toISOString()
                              : null
                            : e.target.value === "" && field.nullable
                              ? null
                              : e.target.value,
                      )
                    }
                  />
                )}
              </label>
            );
          })}
        </div>
      </ApiForm>
    </section>
  );
}

export function RelationsEditor({
  products,
  initial,
}: {
  products: { id: string; sku: string; name: { en: string } }[];
  initial: { product_id: string; related_id: string; kind: string }[];
}) {
  const [product, setProduct] = useState(products[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const entries = (id: string) =>
    initial
      .filter((r) => r.product_id === id)
      .map((r) => ({ id: r.related_id, kind: r.kind }));
  const [relations, setRelations] = useState(entries(product));
  return (
    <section className="panel stack">
      <h2>Curated recommendations</h2>
      <label>
        Source product
        <select
          value={product}
          onChange={(e) => {
            setProduct(e.target.value);
            setRelations(entries(e.target.value));
          }}
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name.en}
            </option>
          ))}
        </select>
      </label>
      <p>
        “Together” suggestions appear only when confirmed for the shopper’s
        selected vehicle. Replacing this list is atomic.
      </p>
      <label>
        Find a related product
        <input value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <ApiForm
        action="admin-relations"
        label="Save recommendations"
        extra={{ json: JSON.stringify({ product, relations }) }}
      >
        <div className="admin-list">
          {products
            .filter(
              (p) =>
                p.id !== product &&
                (p.sku + " " + p.name.en)
                  .toLowerCase()
                  .includes(query.toLowerCase()),
            )
            .map((p) => (
              <label key={p.id}>
                {p.sku} · {p.name.en}
                <select
                  value={relations.find((r) => r.id === p.id)?.kind ?? ""}
                  onChange={(e) =>
                    setRelations([
                      ...relations.filter((r) => r.id !== p.id),
                      ...(e.target.value
                        ? [{ id: p.id, kind: e.target.value }]
                        : []),
                    ])
                  }
                >
                  <option value="">No recommendation</option>
                  <option value="alternative">Alternative</option>
                  <option value="together">Buy together</option>
                </select>
              </label>
            ))}
        </div>
      </ApiForm>
    </section>
  );
}

export function ImageManager({
  products,
  product,
  initial,
  fixedProduct = false,
}: {
  products: { id: string; sku: string; name: { en: string } }[];
  product: string;
  initial: { path: string; alt: { ar: string; en: string }; url: string }[];
  fixedProduct?: boolean;
}) {
  const [images, setImages] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState(false);
  async function uploadFiles(files: File[]) {
    if (busy || !product || !files.length) return;
    const remaining = 10 - images.length;
    if (remaining <= 0) {
      setMessage("الحد الأقصى 10 صور لكل منتج.");
      return;
    }
    setBusy(true);
    setMessage("جاري رفع الصور…");
    let uploaded = 0;
    const errors: string[] = [];
    for (const file of files.slice(0, remaining)) {
      try {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
          throw Error("اختار صور JPG أو PNG أو WebP.");
        if (file.size > 5_000_000) throw Error("الحد الأقصى لحجم الصورة 5 ميجابايت.");
        const form = new FormData();
        form.append("image", file);
        const response = await fetch("/api/upload?kind=catalog", {
          method: "POST",
          body: form,
        });
        const result = await response.json();
        if (!response.ok) throw Error(result.error);
        setImages((current) => [
          ...current,
          { path: result.path, url: result.url, alt: { ar: "", en: "" } },
        ]);
        uploaded++;
      } catch (error) {
        errors.push(
          `${file.name}: ${error instanceof Error ? error.message : "فشل رفع الصورة"}`,
        );
      }
    }
    setMessage(
      `${uploaded} صورة اترفعت. اكتب وصف الصور واضغط حفظ.${files.length > remaining ? " تم قبول أول " + remaining + " صور فقط (الحد الأقصى 10)." : ""} ${errors.join(" ")}`,
    );
    setBusy(false);
  }
  return (
    <section className="panel stack admin-product-images" lang="ar" dir="rtl">
      <h2>صور المنتج</h2>
      {!fixedProduct && (
        <label>
          المنتج
          <select
            value={product}
            onChange={(e) => {
              window.location.assign(
                "/admin?module=images&id=" + encodeURIComponent(e.target.value),
              );
            }}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} · {p.name.en}
              </option>
            ))}
          </select>
        </label>
      )}
      <p>
        أول صورة هي الصورة الأساسية اللي بتظهر للعميل. اكتب وصف الصورة بالعربي والإنجليزي، وبعدها احفظ الترتيب.
      </p>
      <div
        className={
          uploadStyles.dropzone + " " + (dragging ? uploadStyles.active : "")
        }
        data-testid="product-photo-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void uploadFiles(Array.from(e.dataTransfer.files));
        }}
      >
        <strong>
          {busy ? "جاري رفع الصور…" : "اسحب صور المنتج هنا أو اختارها من جهازك"}
        </strong>
        <p>
          تقدر ترفع أكتر من صورة مرة واحدة. JPG أو PNG أو WebP، بحد أقصى 5 ميجابايت للصورة و10 صور للمنتج.
        </p>
        <label>
          اختيار صور المنتج
          <input
            aria-label="رفع صور المنتج"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={busy || images.length >= 10 || !product}
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              void uploadFiles(files);
            }}
          />
        </label>
      </div>
      <p role="status">{message}</p>
      {images.length > 0 && validateProductPhotos(images) && (
        <p role="alert" className="notice">لازم تكتب وصف عربي وإنجليزي لكل صورة قبل الحفظ.</p>
      )}
      <ApiForm
        action="admin-images"
        label="حفظ الصور وترتيبها"
        disabled={busy || !product || Boolean(validateProductPhotos(images))}
        extra={{
          json: JSON.stringify({
            product,
            images: images.map(({ path, alt }) => ({ path, alt })),
          }),
        }}
      >
        {images.map((image, index) => (
          <article className="panel stack admin-product-image-card" key={image.path}>
            {image.url && (
              <img
                src={image.url}
                alt={image.alt.en}
                width={180}
                height={150}
                style={{ objectFit: "contain" }}
              />
            )}
            <h3>{index === 0 ? "الصورة الأساسية" : `صورة ${index + 1}`}</h3>
            {(["ar", "en"] as const).map((lang) => (
              <label key={lang}>
                وصف الصورة · {lang}
                <input
                  required
                  minLength={1}
                  maxLength={500}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  value={image.alt[lang]}
                  onChange={(e) =>
                    setImages((current) =>
                      current.map((x, i) =>
                        i === index
                          ? { ...x, alt: { ...x.alt, [lang]: e.target.value } }
                          : x,
                      ),
                    )
                  }
                />
              </label>
            ))}
            <div className="admin-nav admin-product-image-actions">
              {index !== 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setImages((current) => moveProductPhoto(current, index, 0))}
                >
                  تعيين كصورة أساسية
                </button>
              )}
              <button
                type="button"
                disabled={busy || index === 0}
                onClick={() =>
                  setImages((current) => moveProductPhoto(current, index, index - 1))
                }
              >
                تحريك للأمام
              </button>
              <button
                type="button"
                disabled={busy || index === images.length - 1}
                onClick={() =>
                  setImages((current) => moveProductPhoto(current, index, index + 1))
                }
              >
                تحريك للخلف
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  setImages((current) => current.filter((_, i) => i !== index))
                }
              >
                إزالة من المنتج
              </button>
            </div>
          </article>
        ))}
        {!images.length && <p>مفيش صور مضافة للمنتج.</p>}
      </ApiForm>
    </section>
  );
}

export function BrandingMedia({
  slots,
  initial,
}: {
  slots: { slot: string; label: string }[];
  initial: Record<
    string,
    { path: string; alt: { ar: string; en: string }; url?: string }
  >;
}) {
  const [slot, setSlot] = useState(slots[0]?.slot ?? "hero");
  const [record, setRecord] = useState<{
    path: string | null;
    url?: string;
    alt: { ar: string; en: string };
  }>(
    initial[slot] ?? {
      path: null as string | null,
      alt: { ar: "صورة المتجر", en: "Store image" },
    },
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <section className="panel stack">
      <h2>Branding and editorial media</h2>
      <label htmlFor="branding-slot">Image location</label>
      <select
        id="branding-slot"
        disabled={busy}
        value={slot}
        onChange={(e) => {
          setSlot(e.target.value);
          setRecord(
            initial[e.target.value] ?? {
              path: null,
              alt: { ar: "صورة المتجر", en: "Store image" },
            },
          );
          setMessage("");
        }}
      >
        {slots.map((s) => (
          <option key={s.slot} value={s.slot}>
            {s.label}
          </option>
        ))}
      </select>
      <p>
        Uploaded images override the default artwork. Remove the assignment and
        save to restore it. Photos and raster logos are sanitized as JPEG;
        transparency is flattened.
      </p>
      {record.url && (
        <img
          src={record.url}
          alt={record.alt.en}
          width={280}
          height={180}
          style={{ objectFit: "contain", maxWidth: "100%" }}
        />
      )}
      <label>
        Upload replacement
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage("");
            try {
              const form = new FormData();
              form.append("image", file);
              const response = await fetch("/api/upload?kind=site", {
                method: "POST",
                body: form,
              });
              const result = await response.json();
              if (!response.ok) throw Error(result.error);
              setRecord((current) => ({
                ...current,
                path: result.path,
                url: result.url,
              }));
              setMessage("Uploaded. Save the assignment to use it.");
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <p role="status">{message}</p>
      <ApiForm
        action="admin-site-media"
        label="Save media assignment"
        disabled={busy}
        extra={{
          json: JSON.stringify({ slot, path: record.path, alt: record.alt }),
        }}
      >
        {(["ar", "en"] as const).map((lang) => (
          <label key={lang}>
            Media description · {lang}
            <input
              value={record.alt[lang]}
              required
              minLength={1}
              maxLength={500}
              dir={lang === "ar" ? "rtl" : "ltr"}
              onChange={(e) =>
                setRecord((current) => ({
                  ...current,
                  alt: { ...current.alt, [lang]: e.target.value },
                }))
              }
            />
          </label>
        ))}
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() =>
            setRecord({
              path: null,
              alt: { ar: "صورة المتجر", en: "Store image" },
            })
          }
        >
          Restore default artwork
        </button>
      </ApiForm>
    </section>
  );
}
