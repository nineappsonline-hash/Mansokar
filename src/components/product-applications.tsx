"use client";
import { useState } from "react";
import type { Vehicle } from "@/lib/catalog";
import type { ProductApplication } from "@/lib/product-applications";
import styles from "./product-applications.module.css";
type Model = {
  id: string;
  brand: string;
  slug: string;
  name: { en: string; ar?: string };
};
export function ProductApplications({
  brands,
  models,
  vehicles,
  applications,
  onChange,
  exactIds,
  onExactChange,
}: {
  brands: { slug: string; name: string }[];
  models: Model[];
  vehicles: Vehicle[];
  applications: ProductApplication[];
  onChange: (a: ProductApplication[]) => void;
  exactIds: string[];
  onExactChange: (ids: string[]) => void;
}) {
  const [makes, setMakes] = useState<string[]>([]),
    [search, setSearch] = useState("");
  const years = Array.from(
    { length: new Date().getFullYear() + 2 - 1950 },
    (_, i) => new Date().getFullYear() + 1 - i,
  );
  const setYears = (id: string, next: number[]) =>
    onChange(
      applications.map((a) =>
        a.model_id === id ? { ...a, years: [...new Set(next)] } : a,
      ),
    );
  return (
    <div className="stack">
      <h2>Cars & years this part suits</h2>
      <p>
        Select one or more models, then enter a start and end year or tick
        individual years. You can combine different makes and models in the same
        product.
      </p>
      <fieldset className="stack">
        <legend>1. Find the car models</legend>
        <div className={styles.makes}>
          {brands.map((b) => (
            <button
              type="button"
              key={b.slug}
              aria-pressed={makes.includes(b.slug)}
              onClick={() =>
                setMakes(
                  makes.includes(b.slug)
                    ? makes.filter((m) => m !== b.slug)
                    : [...makes, b.slug],
                )
              }
            >
              {b.name}
            </button>
          ))}
        </div>
        <label>
          Search car models
          <input
            placeholder="Astra, Cruze, MG…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className={styles.models}>
          {models
            .filter(
              (m) =>
                (!makes.length || makes.includes(m.brand)) &&
                `${m.name.en} ${m.name.ar || ""}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            )
            .map((m) => (
              <label className="check" key={m.id}>
                <input
                  type="checkbox"
                  checked={applications.some((a) => a.model_id === m.id)}
                  onChange={(e) =>
                    onChange(
                      e.target.checked
                        ? [...applications, { model_id: m.id, years: [] }]
                        : applications.filter((a) => a.model_id !== m.id),
                    )
                  }
                />
                {brands.find((b) => b.slug === m.brand)?.name} {m.name.en}
              </label>
            ))}
        </div>
      </fieldset>
      <p>
        {applications.length} models selected ·{" "}
        {applications.reduce((n, a) => n + a.years.length, 0)} model years
      </p>
      {applications.map((a) => {
        const model = models.find((m) => m.id === a.model_id);
        return (
          <fieldset className="stack" key={a.model_id}>
            <legend>
              {brands.find((b) => b.slug === model?.brand)?.name}{" "}
              {model?.name.en ?? a.model_id}
            </legend>
            <YearPicker
              years={years}
              selected={a.years}
              onChange={(next) => setYears(a.model_id, next)}
            />
            <button
              type="button"
              onClick={() =>
                onChange(applications.filter((x) => x.model_id !== a.model_id))
              }
            >
              Remove this model
            </button>
          </fieldset>
        );
      })}
      {!applications.length && (
        <p>
          Choose a model above to see its years. Years are available even if no
          engine versions have been registered yet.
        </p>
      )}
      <details>
        <summary>Optional: exact engine versions</summary>
        <p>
          Model-year selection records the cars you specify. To show an
          engine-specific compatibility match in the storefront, select the
          verified version below.
        </p>
        <div className={styles.models}>
          {vehicles
            .filter(
              (v) =>
                applications.some((a) => {
                  const m = models.find((m) => m.id === a.model_id);
                  return (
                    m?.brand === v.brand &&
                    m.slug === v.model &&
                    a.years.includes(v.year)
                  );
                }) || exactIds.includes(v.id),
            )
            .map((v) => (
              <label key={v.id} className="check">
                <input
                  type="checkbox"
                  checked={exactIds.includes(v.id)}
                  onChange={(e) =>
                    onExactChange(
                      e.target.checked
                        ? [...exactIds, v.id]
                        : exactIds.filter((id) => id !== v.id),
                    )
                  }
                />
                {v.name.en}
              </label>
            ))}
        </div>
      </details>
    </div>
  );
}
function YearPicker({
  years,
  selected,
  onChange,
}: {
  years: number[];
  selected: number[];
  onChange: (years: number[]) => void;
}) {
  const [query, setQuery] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  return (
    <>
      <div className={styles.range}>
        <label>
          Start year
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Choose</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          End year
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Choose</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="button secondary"
          disabled={!from || !to || Number(to) < Number(from)}
          onClick={() =>
            onChange([
              ...selected,
              ...years.filter((y) => y >= Number(from) && y <= Number(to)),
            ])
          }
        >
          Add year range
        </button>
      </div>
      <p>
        Both years are included. A range of 2015–2020 selects 2015, 2016, 2017,
        2018, 2019 and 2020 individually.
      </p>
      <label>
        Find a year
        <input
          inputMode="numeric"
          placeholder="e.g. 2021"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className={styles.years}>
        {years
          .filter((y) => String(y).includes(query))
          .map((y) => (
            <label key={y} className="check">
              <input
                type="checkbox"
                checked={selected.includes(y)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? [...selected, y]
                      : selected.filter((x) => x !== y),
                  )
                }
              />
              {y}
            </label>
          ))}
      </div>
      <p>
        Selected years:{" "}
        {selected.length
          ? [...selected].sort((a, b) => a - b).join(", ")
          : "None yet"}
      </p>
      <button type="button" onClick={() => onChange([])}>
        Clear years
      </button>
    </>
  );
}
