"use client";
import { useState, type CSSProperties } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  CalendarDays,
  CarFront,
  ChevronDown,
  ArrowUpRight,
  Sparkles,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Locale, Text } from "@/lib/catalog";
import styles from "./model-year-cards.module.css";

export function ModelYearCards({
  locale,
  brand,
  models,
  initialQuery = "",
  initialSort = "default",
}: {
  locale: Locale;
  brand: { slug: string; name: string; ar: string };
  initialQuery?: string;
  initialSort?: string;
  models: { slug: string; name: Text; photo?: string; years: number[] }[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(initialSort);
  const reduced = useReducedMotion();
  const ar = locale === "ar";
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f\u064B-\u065F]/g, "");
  const visible = models.filter((m) =>
    normalize(`${m.slug} ${m.name.ar} ${m.name.en}`).includes(
      normalize(query.trim()),
    ),
  );
  const latest = (years: number[]) => (years.length ? Math.max(...years) : 0);
  if (sort === "name")
    visible.sort((a, b) =>
      a.name[locale].localeCompare(b.name[locale], ar ? "ar" : "en", {
        numeric: true,
      }),
    );
  if (sort === "newest")
    visible.sort((a, b) => latest(b.years) - latest(a.years));
  if (sort === "years")
    visible.sort((a, b) => new Set(b.years).size - new Set(a.years).size);
  return (
    <>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <Search size={25} aria-hidden="true" />
          <span className="sr-only">
            {ar ? "بحث الموديلات" : "Search models"}
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              ar
                ? `بحث في موديلات ${brand.ar}…`
                : `Search ${brand.name} models…`
            }
            maxLength={100}
          />
        </label>
        <label className={styles.sort}>
          <SlidersHorizontal size={22} aria-hidden="true" />
          <span className="sr-only">{ar ? "ترتيب حسب" : "Sort models"}</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="default">{ar ? "ترتيب حسب" : "Sort by"}</option>
            <option value="name">{ar ? "اسم الموديل" : "Model name"}</option>
            <option value="newest">{ar ? "الأحدث سنة" : "Newest year"}</option>
            <option value="years">{ar ? "الأكثر سنوات" : "Most years"}</option>
          </select>
        </label>
      </div>
      {!visible.length && (
        <div className={styles.noResults} role="status">
          <CarFront size={46} />
          <p>
            {ar
              ? "لا توجد موديلات مطابقة لبحثك."
              : "No models match your search."}
          </p>
          <button type="button" onClick={() => setQuery("")}>
            {ar ? "عرض كل الموديلات" : "Show all models"}
          </button>
        </div>
      )}
      <div className={`model-grid ${styles.grid}`}>
        {visible.map((model) => {
          const open = active === model.slug;
          const panelId = `model-years-${brand.slug}-${model.slug}`;
          const href = `/${locale}/brands/${brand.slug}/${model.slug}`;
          const years = [...new Set(model.years)].sort((a, b) => b - a);
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
                  <span className={styles.photoShade} aria-hidden="true" />
                  {years.length > 0 && (
                    <span className={styles.yearBadge}>
                      <CarFront size={18} aria-hidden="true" />
                      {ar
                        ? `${years.length} سنة`
                        : `${years.length} ${years.length === 1 ? "year" : "years"}`}
                    </span>
                  )}
                </div>
                <div className={styles.heading}>
                  <h2>
                    {ar ? brand.ar : brand.name} {model.name[locale]}
                  </h2>
                  <p className={styles.range}>
                    <CalendarDays size={21} aria-hidden="true" />
                    {years.length ? (
                      <>
                        <span>
                          {ar ? "الموديلات المتاحة:" : "Available years:"}
                        </span>
                        <bdi>
                          {years.length === 1
                            ? years[0]
                            : `${years[years.length - 1]} – ${years[0]}`}
                        </bdi>
                      </>
                    ) : (
                      <span>
                        {ar
                          ? "سنوات الصنع تُضاف قريبًا"
                          : "Model years coming soon"}
                      </span>
                    )}
                  </p>
                  <span className={styles.prompt}>
                    <span>{ar ? "عرض قطع الغيار" : "View spare parts"}</span>
                    <ChevronDown
                      size={21}
                      className={styles.chevron}
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </button>
              <motion.div
                className={styles.expansion}
                id={panelId}
                initial={false}
                animate={open ? "open" : "closed"}
                variants={{
                  open: { height: "auto", opacity: 1 },
                  closed: { height: 0, opacity: 0 },
                }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        height: {
                          duration: 0.52,
                          ease: [0.22, 1, 0.36, 1],
                        },
                        opacity: { duration: 0.3, ease: "easeOut" },
                      }
                }
                inert={!open}
              >
                <div className={styles.inner}>
                  <div className={styles.yearsPanel}>
                    <div className={styles.panelHead}>
                      <span className={styles.panelEyebrow}>
                        <Sparkles size={13} aria-hidden="true" />
                        {ar ? "سنة الصنع" : "Model year"}
                      </span>
                      {years.length > 0 && (
                        <span className={styles.panelCount}>
                          {ar
                            ? `${years.length} سنة متاحة`
                            : `${years.length} ${years.length === 1 ? "year" : "years"} available`}
                        </span>
                      )}
                    </div>
                    {years.length ? (
                      <div
                        className={styles.years}
                        aria-label={
                          ar
                            ? `سنوات ${model.name.ar}`
                            : `${model.name.en} years`
                        }
                      >
                        {years.map((year, index) => (
                          <Link
                            key={year}
                            data-model-year={year}
                            className={styles.year}
                            style={{ "--i": index } as CSSProperties}
                            href={`${href}?year=${year}`}
                          >
                            <span>{year}</span>
                            <ArrowUpRight
                              className={styles.yearArrow}
                              size={13}
                              aria-hidden="true"
                            />
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
                      <span>
                        {ar
                          ? "تصفح قطع الغيار لكل السنوات"
                          : "Browse parts for all years"}
                      </span>
                      <span className={styles.browseArrow}>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </article>
          );
        })}
      </div>
    </>
  );
}
