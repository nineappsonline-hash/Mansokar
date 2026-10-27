"use client";
import { useEffect, useState, useRef } from "react";
import { Search } from "lucide-react";
import type { Locale, Text } from "@/lib/catalog";
import { t } from "@/lib/i18n";
export function SearchBox({ locale }: { locale: Locale }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; slug: string; name: Text; partNumber: string }[]
  >([]);
  const [categoryResults, setCategoryResults] = useState<
    { slug: string; name: Text }[]
  >([]);
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setCategoryResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/suggest?q=" + encodeURIComponent(query), {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data) => {
          setResults(data.products ?? []);
          setCategoryResults(data.categories ?? []);
        })
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  return (
    <div className="search-widget">
      <form
        action={`/${locale}/catalog`}
        className="hero-search"
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node))
            setOpen(false);
        }}
      >
        <Search size={21} />
        <input
          id="home-search"
          name="q"
          aria-label={t(locale).search}
          placeholder={t(locale).search}
          maxLength={100}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown")
              list.current?.querySelector("a")?.focus();
          }}
        />
        <button aria-label={t(locale).search}>
          <Search size={24} />
        </button>
      </form>
      {open && (results.length > 0 || categoryResults.length > 0) && (
        <div
          className="search-suggestions"
          id="search-suggestions"
          ref={list}
          role="region"
          aria-label={locale === "ar" ? "اقتراحات البحث" : "Search suggestions"}
        >
          {categoryResults.length > 0 && (
            <>
              <p className="small muted">
                {locale === "ar" ? "الفئات" : "Categories"}
              </p>
              {categoryResults.map((c) => (
                <a key={c.slug} href={`/${locale}/categories/${c.slug}`}>
                  <span>{c.name[locale]}</span>
                  <small>
                    {locale === "ar" ? "تصفح الفئة" : "Browse category"}
                  </small>
                </a>
              ))}
            </>
          )}
          {results.length > 0 && (
            <p className="small muted">{locale === "ar" ? "القطع" : "Parts"}</p>
          )}
          {results.map((p) => (
            <a href={`/${locale}/products/${p.slug}`} key={p.id}>
              <span>{p.name[locale]}</span>
              <small>{p.partNumber}</small>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
