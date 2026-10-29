"use client";
import { useState } from "react";
import type { Locale } from "@/lib/catalog";
export function CatalogCarFilters({
  locale,
  brands,
  models,
  initial,
}: {
  locale: Locale;
  brands: { slug: string; name: string; ar: string }[];
  models: { brand: string; slug: string; name: { ar: string; en: string } }[];
  initial: { make?: string; model?: string; year?: string };
}) {
  const [make, setMake] = useState(initial.make || ""),
    [model, setModel] = useState(initial.model || ""),
    [year, setYear] = useState(initial.year || "");
  const ar = locale === "ar";
  const years = Array.from(
    { length: new Date().getFullYear() + 2 - 1950 },
    (_, i) => new Date().getFullYear() + 1 - i,
  );
  return (
    <>
      <label>
        {ar ? "ماركة السيارة" : "Car make"}
        <select
          name="make"
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
            setYear("");
          }}
        >
          <option value="">{ar ? "كل الماركات" : "All makes"}</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {ar ? b.ar : b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        {ar ? "موديل السيارة" : "Car model"}
        <select
          name="model"
          disabled={!make}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setYear("");
          }}
        >
          <option value="">{ar ? "كل الموديلات" : "All models"}</option>
          {models
            .filter((m) => m.brand === make)
            .map((m) => (
              <option key={m.slug} value={m.slug}>
                {m.name[locale]}
              </option>
            ))}
        </select>
      </label>
      <label>
        {ar ? "سنة السيارة" : "Model year"}
        <select
          name="year"
          disabled={!model}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">{ar ? "كل السنوات" : "All years"}</option>
          {years.map((y) => (
            <option key={y}>{y}</option>
          ))}
        </select>
      </label>
    </>
  );
}
