"use client";
import { useState, useContext } from "react";
import { ProductEditorTab } from "./product-editor-context";
import { ProductApplications } from "./product-applications";
import {
  readApplications,
  applicationSpecs,
  type ProductApplication,
} from "@/lib/product-applications";
import { ApiForm } from "./forms";
import type { Vehicle } from "@/lib/catalog";
export function SimpleProductEditor({
  initial,
  manufacturers,
  vehicles,
  selected,
  brands,
  models,
}: {
  initial: any;
  manufacturers: string[];
  vehicles: Vehicle[];
  selected: string[];
  brands: { slug: string; name: string; ar?: string }[];
  models: { id: string; brand: string; slug: string; name: { en: string } }[];
}) {
  const [value, setValue] = useState<any>(
    initial.id
      ? initial
      : {
          name: { ar: "", en: "" },
          manufacturer: "",
          price: 0,
          cost: null,
          sale: null,
          partNumber: "",
          type: "aftermarket",
          status: "draft",
          demo: false,
          orderable: true,
          specs: {},
        },
  );
  const [ids, setIds] = useState(selected);
  const activeTab = useContext(ProductEditorTab);
  const [applications, setApplications] = useState<ProductApplication[]>(() => {
    const saved = readApplications(initial.specs);
    if (saved.length) return saved;
    const groups = new Map<string, number[]>();
    for (const id of selected) {
      const v = vehicles.find((v) => v.id === id);
      const m = models.find((m) => m.brand === v?.brand && m.slug === v?.model);
      if (v && m)
        groups.set(m.id, [...new Set([...(groups.get(m.id) || []), v.year])]);
    }
    return [...groups].map(([model_id, years]) => ({ model_id, years }));
  });
  const [months, setMonths] = useState(initial.specs?.warranty_months ?? "");
  const [makers, setMakers] = useState(manufacturers);
  const availableMakers = [...new Set([...manufacturers, ...makers])];
  const [addBrand, setAddBrand] = useState(false);
  return (
    <section className="panel stack">
      <h2>
        {activeTab === "vehicles"
          ? "Choose cars & years"
          : value.id
            ? "Edit product"
            : "New product"}
      </h2>
      {activeTab === "vehicles" &&
        (!value.name.en.trim() ||
          !value.name.ar.trim() ||
          !value.manufacturer.trim() ||
          !value.partNumber.trim()) && (
          <p>
            Complete the required fields in Product details before saving. You
            can choose cars and years now.
          </p>
        )}
      {applications.some((a) => !a.years.length) && (
        <p>
          Select at least one year for each chosen model, or remove that model.
        </p>
      )}
      <ApiForm
        action="admin-product"
        label="Save product"
        disabled={
          !value.name.en.trim() ||
          !value.name.ar.trim() ||
          !value.manufacturer.trim() ||
          !value.partNumber.trim() ||
          applications.some((a) => !a.years.length)
        }
        extra={{
          json: JSON.stringify({
            ...value,
            automatic: true,
            fitments: ids,
            applications,
            specs: applicationSpecs(value.specs || {}, applications),
            warrantyMonths: months === "" ? null : Number(months),
            addBrand,
          }),
        }}
      >
        <div hidden={activeTab !== "details"}>
          <div className="stack">
            {(["en", "ar"] as const).map((lang) => (
              <label key={lang}>
                Spare part name · {lang}
                <input
                  required
                  maxLength={200}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  value={value.name[lang]}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      name: { ...value.name, [lang]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
            <label>
              Item brand — search or select
              <input
                required
                list="item-brands"
                maxLength={100}
                value={value.manufacturer}
                onChange={(e) => {
                  setValue({ ...value, manufacturer: e.target.value });
                  setAddBrand(false);
                }}
              />
              <datalist id="item-brands">
                {availableMakers.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
            {value.manufacturer.trim() &&
              !availableMakers.includes(value.manufacturer.trim()) && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    setMakers([...makers, value.manufacturer.trim()]);
                    setAddBrand(true);
                  }}
                >
                  Add “{value.manufacturer.trim()}” as a new item brand
                </button>
              )}
            <label>
              Warranty · months (blank if not supplied)
              <input
                type="number"
                min={1}
                max={600}
                step={1}
                value={months}
                onChange={(e) => setMonths(e.target.value)}
              />
            </label>
            <label>
              Country of origin
              <input
                maxLength={100}
                value={value.specs?.country_of_origin ?? ""}
                onChange={(e) =>
                  setValue({
                    ...value,
                    specs: {
                      ...value.specs,
                      country_of_origin: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              Part number
              <input
                required
                maxLength={100}
                value={value.partNumber}
                onChange={(e) =>
                  setValue({ ...value, partNumber: e.target.value })
                }
              />
            </label>
            {(["price", "sale", "cost"] as const).map((key) => (
              <label key={key}>
                {
                  {
                    price: "Sale price",
                    sale: "Discount price (optional)",
                    cost: "Cost price",
                  }[key]
                }{" "}
                · EGP
                <input
                  required={key === "price"}
                  type="number"
                  min={0}
                  step="0.01"
                  value={value[key] == null ? "" : value[key] / 100}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      [key]:
                        e.target.value === ""
                          ? null
                          : Math.round(Number(e.target.value) * 100),
                    })
                  }
                />
              </label>
            ))}
            <label>
              Type
              <select
                value={value.type}
                onChange={(e) => setValue({ ...value, type: e.target.value })}
              >
                <option value="oem">Original</option>
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
            <label className="check">
              <input
                type="checkbox"
                checked={value.orderable}
                onChange={(e) =>
                  setValue({ ...value, orderable: e.target.checked })
                }
              />
              Available to order
            </label>
            <p>
              SKU, product URL, Arabic/English descriptions and SEO are
              generated when you save.
              {value.id ? ` SKU: ${value.sku}. Existing URL is preserved.` : ""}
            </p>
          </div>
        </div>
        <div hidden={activeTab !== "vehicles"}>
          <ProductApplications
            brands={brands}
            models={models}
            vehicles={vehicles}
            applications={applications}
            onChange={(next) => {
              setApplications(next);
              setIds(
                ids.filter((id) => {
                  const v = vehicles.find((v) => v.id === id);
                  return next.some((a) => {
                    const m = models.find((m) => m.id === a.model_id);
                    return (
                      m?.brand === v?.brand &&
                      m?.slug === v?.model &&
                      a.years.includes(v?.year ?? 0)
                    );
                  });
                }),
              );
            }}
            exactIds={ids}
            onExactChange={setIds}
          />
        </div>
      </ApiForm>
    </section>
  );
}
