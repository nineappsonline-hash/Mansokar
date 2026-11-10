"use client";
import { useState } from "react";
import { CarFront, Layers3, CalendarDays, Search } from "lucide-react";
import type { Locale, Text } from "@/lib/catalog";
export function HomeVehicleFinder({
  locale,
  brands,
  models,
}: {
  locale: Locale;
  brands: { slug: string; name: string; ar: string }[];
  models: { brand: string; slug: string; name: Text; years: number[] }[];
}) {
  const [make, setMake] = useState(""),
    [model, setModel] = useState(""),
    [year, setYear] = useState("");
  const ar = locale === "ar",
    years =
      models.find((m) => m.brand === make && m.slug === model)?.years || [];
  return (
    <form
      className="cyan-vehicle-finder"
      action={`/${locale}/catalog`}
      aria-label={ar ? "اختار عربيتك" : "Find parts for your car"}
    >
      <label>
        <CarFront aria-hidden="true" />
        <span className="sr-only">{ar ? "ماركة العربية" : "Car make"}</span>
        <select
          name="make"
          required
          value={make}
          onChange={(e) => {
            setMake(e.target.value);
            setModel("");
            setYear("");
          }}
        >
          <option value="">{ar ? "اختار الماركة" : "Choose make"}</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.slug}>
              {ar ? b.ar : b.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Layers3 aria-hidden="true" />
        <span className="sr-only">{ar ? "موديل العربية" : "Car model"}</span>
        <select
          name="model"
          required
          disabled={!make}
          value={model}
          onChange={(e) => {
            setModel(e.target.value);
            setYear("");
          }}
        >
          <option value="">{ar ? "اختار الموديل" : "Choose model"}</option>
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
        <CalendarDays aria-hidden="true" />
        <span className="sr-only">{ar ? "سنة الصنع" : "Model year"}</span>
        <select
          name="year"
          disabled={!model}
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          <option value="">{ar ? "اختار سنة الصنع" : "Choose year"}</option>
          {[...new Set(years)]
            .sort((a, b) => b - a)
            .map((y) => (
              <option key={y}>{y}</option>
            ))}
        </select>
      </label>
      <button className="button cyan-button" type="submit">
        <Search size={25} />
        {ar ? "عرض قطع الغيار" : "Find spare parts"}
      </button>
    </form>
  );
}
