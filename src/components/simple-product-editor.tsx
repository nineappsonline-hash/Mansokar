"use client";
import { useState } from "react";
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
  brands: { slug: string; name: string }[];
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
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [months, setMonths] = useState(initial.specs?.warranty_months ?? "");
  const [makers, setMakers] = useState(manufacturers);
  const availableMakers = [...new Set([...manufacturers, ...makers])];
  const [addBrand, setAddBrand] = useState(false);
  const candidates = vehicles.filter(
    (v) => v.brand === make && v.model === model && String(v.year) === year,
  );
  const years = [
    ...new Set(
      vehicles
        .filter((v) => v.brand === make && v.model === model)
        .map((v) => v.year),
    ),
  ].sort((a, b) => b - a);
  return (
    <section className="panel stack">
      <h2>{value.id ? "Edit product" : "New product"}</h2>
      <ApiForm
        action="admin-product"
        label="Save product"
        extra={{
          json: JSON.stringify({
            ...value,
            automatic: true,
            fitments: ids,
            warrantyMonths: months === "" ? null : Number(months),
            addBrand,
          }),
        }}
      >
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
        <fieldset className="stack">
          <legend>Cars this part suits</legend>
          <label>
            Car make
            <select
              value={make}
              onChange={(e) => {
                setMake(e.target.value);
                setModel("");
                setYear("");
              }}
            >
              <option value="">Choose make</option>
              {brands.map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Car model
            <select
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setYear("");
              }}
            >
              <option value="">Choose model</option>
              {models
                .filter((m) => m.brand === make)
                .map((m) => (
                  <option key={m.id} value={m.slug}>
                    {m.name.en}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Model year
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Choose year</option>
              {years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          {model && !years.length && (
            <p>
              Add this model’s years and configurations in Admin → Vehicles
              first.
            </p>
          )}
          {candidates.map((v) => (
            <label className="check" key={v.id}>
              <input
                type="checkbox"
                checked={ids.includes(v.id)}
                onChange={(e) =>
                  setIds(
                    e.target.checked
                      ? [...ids, v.id]
                      : ids.filter((id) => id !== v.id),
                  )
                }
              />
              {v.name.en}
            </label>
          ))}
          {ids.map((id) => (
            <p key={id}>
              {vehicles.find((v) => v.id === id)?.name.en ?? id}{" "}
              <button
                type="button"
                onClick={() => setIds(ids.filter((x) => x !== id))}
              >
                Remove
              </button>
            </p>
          ))}
        </fieldset>
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
                specs: { ...value.specs, country_of_origin: e.target.value },
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
            onChange={(e) => setValue({ ...value, partNumber: e.target.value })}
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
            <option value="aftermarket">Aftermarket</option>
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
          SKU, product URL, Arabic/English descriptions and SEO are generated
          when you save.
          {value.id ? ` SKU: ${value.sku}. Existing URL is preserved.` : ""}
        </p>
      </ApiForm>
    </section>
  );
}
