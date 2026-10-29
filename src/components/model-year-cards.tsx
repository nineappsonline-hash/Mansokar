"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  CarFront,
  ChevronDown,
  ArrowUpRight,
} from "lucide-react";
import type { Locale, Text } from "@/lib/catalog";
import styles from "./model-year-cards.module.css";

export function ModelYearCards({
  locale,
  brand,
  models,
}: {
  locale: Locale;
  brand: { slug: string; name: string; ar: string };
  models: { slug: string; name: Text; photo?: string; years: number[] }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const ar = locale === "ar";
  return (
    <div className={`model-grid ${styles.grid}`}>
      {models.map((model) => {
        const open = active === model.slug;
        const panelId = `model-years-${brand.slug}-${model.slug}`;
        const href = `/${locale}/brands/${brand.slug}/${model.slug}`;
        return (
          <article
            key={model.slug}
            data-model={model.slug}
            className={`model-card panel ${styles.card} ${open ? styles.open : ""}`}
          >
            <button
              type="button"
              className={styles.toggle}
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => setActive(open ? null : model.slug)}
            >
              <div className={`model-art model-photo ${styles.photo}`}>
                {model.photo ? (
                  <Image
                    src={model.photo}
                    alt={`${ar ? brand.ar : brand.name} ${model.name[locale]}`}
                    fill
                    sizes="(max-width:760px) 50vw, 33vw"
                  />
                ) : (
                  <CarFront size={88} strokeWidth={0.7} aria-hidden="true" />
                )}
              </div>
              <h2>
                {ar ? brand.ar : brand.name} {model.name[locale]}
              </h2>
              <span className={styles.prompt}>
                <span>
                  <CalendarDays size={16} />
                  {ar ? "اختار سنة سيارتك" : "Choose your model year"}
                </span>
                <ChevronDown size={18} className={styles.chevron} />
              </span>
            </button>
            <div className={styles.expansion} id={panelId} inert={!open}>
              <div className={styles.inner}>
                <div className={styles.yearsPanel}>
                  <p>{ar ? "سنة الصنع" : "Model year"}</p>
                  {model.years.length ? (
                    <div
                      className={styles.years}
                      aria-label={
                        ar ? `سنوات ${model.name.ar}` : `${model.name.en} years`
                      }
                    >
                      {[...new Set(model.years)]
                        .sort((a, b) => b - a)
                        .map((year) => (
                          <Link
                            key={year}
                            data-model-year={year}
                            className={styles.year}
                            href={`${href}?year=${year}`}
                          >
                            {year}
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </Link>
                        ))}
                    </div>
                  ) : (
                    <p className={styles.empty}>
                      {ar
                        ? "سنوات هذا الموديل لم تُضف بعد."
                        : "Years have not been added for this model yet."}
                    </p>
                  )}
                  <Link
                    className={styles.browseAll}
                    data-model-browse
                    href={href}
                  >
                    {ar
                      ? "تصفح قطع الغيار لكل السنوات"
                      : "Browse parts for all years"}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
