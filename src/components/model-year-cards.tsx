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
  const reduced = useReducedMotion();
  const ar = locale === "ar";
  return (
    <div className={`model-grid ${styles.grid}`}>
      {models.map((model) => {
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
                    <CalendarDays size={12} aria-hidden="true" />
                    {years.length}
                  </span>
                )}
              </div>
              <div className={styles.heading}>
                <h2>
                  {ar ? brand.ar : brand.name} {model.name[locale]}
                </h2>
                <span className={styles.prompt}>
                  <span className={styles.promptLabel}>
                    <CalendarDays size={16} aria-hidden="true" />
                    {ar ? "اختار سنة سيارتك" : "Choose your model year"}
                  </span>
                  <span className={styles.chevron}>
                    <ChevronDown size={18} aria-hidden="true" />
                  </span>
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
                        ar ? `سنوات ${model.name.ar}` : `${model.name.en} years`
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
  );
}
