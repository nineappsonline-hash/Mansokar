"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CarFront,
  ChevronDown,
  Home,
  Menu,
  ShoppingBag,
  Tags,
  X,
} from "lucide-react";
import type { Locale } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import styles from "./mobile-navigation.module.css";

export function MobileNavigation({
  locale,
  brands,
}: {
  locale: Locale;
  brands: { slug: string; name: string; ar: string }[];
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const w = t(locale);
  const ar = locale === "ar";
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return (
    <div ref={root} className={styles.root}>
      <button
        ref={button}
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={id}
        aria-label={
          open
            ? ar
              ? "إغلاق القائمة"
              : "Close menu"
            : ar
              ? "فتح القائمة"
              : "Open menu"
        }
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={23} /> : <Menu size={23} />}
      </button>
      <nav
        id={id}
        className={styles.panel}
        hidden={!open}
        aria-label={ar ? "قائمة الهاتف" : "Mobile navigation"}
        onClick={(event) => {
          if ((event.target as Element).closest("a")) setOpen(false);
        }}
      >
        <div className={styles.links}>
          <Link href={`/${locale}`}>
            <Home size={19} />
            {ar ? "الرئيسية" : "Home"}
          </Link>
          <Link href={`/${locale}/catalog`}>
            <ShoppingBag size={19} />
            {w.catalog}
          </Link>
          <details className={styles.brands}>
            <summary>
              <CarFront size={19} />
              <span>{ar ? "تصفح حسب الماركة" : "Shop by make"}</span>
              <ChevronDown size={16} />
            </summary>
            <div>
              {brands.map((b) => (
                <Link key={b.slug} href={`/${locale}/brands/${b.slug}`}>
                  {ar ? b.ar : b.name}
                </Link>
              ))}
            </div>
          </details>
          <Link href={`/${locale}/offers`}>
            <Tags size={19} />
            {w.offers}
          </Link>
          <Link href={`/${locale}/garage`}>
            <CarFront size={19} />
            {w.garage}
          </Link>
          <Link href={`/${locale}/guides`}>
            <BookOpen size={19} />
            {w.guides}
          </Link>
        </div>
      </nav>
    </div>
  );
}
