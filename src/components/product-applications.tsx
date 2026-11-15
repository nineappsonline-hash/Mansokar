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
  brands: { slug: string; name: string; ar?: string }[];
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
  const makeLabel = (slug: string) => {
    const brand = brands.find((b) => b.slug === slug);
    if (!brand) return slug;
    return brand.ar && brand.ar !== brand.name
      ? `${brand.name} — ${brand.ar}`
      : brand.name;
  };
  const modelLabel = (model: Model) => {
    const brand = brands.find((b) => b.slug === model.brand);
    const en = [brand?.name, model.name.en].filter(Boolean).join(" ");
    const ar = [brand?.ar || brand?.name, model.name.ar]
      .filter(Boolean)
      .join(" ");
    return ar && ar !== en ? `${en} — ${ar}` : en;
  };
  return (
    <div className="stack admin-product-applications" lang="ar" dir="rtl">
      <h2>العربيات والسنين المتوافقة مع القطعة</h2>
      <p>
        اختار موديل واحد أو أكتر، وبعدها حدد السنوات من وإلى أو اختار كل سنة بشكل منفصل. تقدر تربط نفس القطعة بأكتر من ماركة وموديل.
      </p>
      <fieldset className="stack">
        <legend>١. اختار الماركة والموديل</legend>
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
              {makeLabel(b.slug)}
            </button>
          ))}
        </div>
        <label>
          ابحث عن موديل العربية
          <input
            placeholder="أسترا، كورسا، MG…"
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
                {modelLabel(m)}
              </label>
            ))}
        </div>
      </fieldset>
      <p>
        {applications.length} موديلات مختارة ·{" "}
        {applications.reduce((n, a) => n + a.years.length, 0)} سنة توافق
      </p>
      {applications.map((a) => {
        const model = models.find((m) => m.id === a.model_id);
        return (
          <fieldset className="stack" key={a.model_id}>
            <legend>{model ? modelLabel(model) : a.model_id}</legend>
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
              إزالة الموديل
            </button>
          </fieldset>
        );
      })}
      {!applications.length && (
        <p>
          اختار موديل من فوق علشان تحدد السنين المتوافقة مع القطعة.
        </p>
      )}
      <details>
        <summary>اختياري: تحديد نسخة المحرك بدقة</summary>
        <p>
          اختيار الموديل والسنة بيسجل التوافق العام. لو القطعة مخصصة لمحرك معين، اختار النسخة المتحقق منها تحت.
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
          من سنة
          <select value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">اختار</option>
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </label>
        <label>
          إلى سنة
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">اختار</option>
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
          إضافة الفترة
        </button>
      </div>
      <p>
        الفترة بتشمل سنة البداية والنهاية، مثلًا من 2015 إلى 2020 تشمل كل السنين بينهم.
      </p>
      <label>
        ابحث عن سنة
        <input
          inputMode="numeric"
          placeholder="مثال: 2021"
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
        السنين المختارة:{" "}
        {selected.length
          ? [...selected].sort((a, b) => a - b).join(", ")
          : "لسه مفيش"}
      </p>
      <button type="button" onClick={() => onChange([])}>
        مسح السنين
      </button>
    </>
  );
}
