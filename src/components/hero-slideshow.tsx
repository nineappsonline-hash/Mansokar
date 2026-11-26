"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { Locale, Text } from "@/lib/catalog";
export type HeroSlide = { id: string; url: string; alt: Text };
export function HeroSlideshow({
  slides,
  locale,
  intervalSeconds = 6,
  autoplay = true,
  children,
}: {
  slides: HeroSlide[];
  locale: Locale;
  intervalSeconds?: number;
  autoplay?: boolean;
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const multiple = slides.length > 1;
  const active = index % Math.max(slides.length, 1);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReduced(media.matches);
    const visibility = () => setHidden(document.hidden);
    motion();
    visibility();
    media.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (
      !multiple ||
      !autoplay ||
      paused ||
      hovered ||
      focused ||
      reduced ||
      hidden
    )
      return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      Math.min(30, Math.max(3, intervalSeconds)) * 1000,
    );
    return () => clearInterval(timer);
  }, [
    multiple,
    autoplay,
    paused,
    hovered,
    focused,
    reduced,
    hidden,
    intervalSeconds,
    slides.length,
  ]);
  const select = (value: number) => {
    const next = (value + slides.length) % slides.length;
    setIndex(next);
    setAnnouncement(
      locale === "ar"
        ? `الشريحة ${next + 1} من ${slides.length}: ${slides[next].alt.ar}`
        : `Slide ${next + 1} of ${slides.length}: ${slides[next].alt.en}`,
    );
  };
  return (
    <>
      <div
        className="cinematic-backdrop hero-slideshow-images"
        aria-hidden="true"
      >
        {slides.map((slide, i) =>
          // Every slide occupies the viewport even when CSS makes it
          // transparent. Browser lazy loading therefore fetches all of them.
          // Keep the first slide ready for LCP, and only mount later slides
          // when they are actually selected by autoplay or the controls.
          i === 0 || i === active ? (
            <Image
              key={slide.id}
              src={slide.url}
              alt=""
              fill
              sizes="100vw"
              preload={i === 0}
              loading={i === 0 ? undefined : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              className={i === active ? "hero-slide is-active" : "hero-slide"}
              data-slide-index={i}
            />
          ) : null,
        )}
      </div>
      <div
        className="hero-slideshow-region"
        data-multiple={multiple}
        role={multiple ? "region" : undefined}
        aria-roledescription={
          multiple ? (locale === "ar" ? "عرض شرائح" : "carousel") : undefined
        }
        aria-label={
          multiple
            ? locale === "ar"
              ? "صور الصفحة الرئيسية"
              : "Homepage slideshow"
            : undefined
        }
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setFocused(false);
        }}
      >
        {children}
        {multiple && (
          <div
            className="hero-slideshow-controls"
            aria-label={
              locale === "ar" ? "التحكم في عرض الشرائح" : "Slideshow controls"
            }
          >
            <button
              type="button"
              aria-label={
                locale === "ar" ? "الشريحة السابقة" : "Previous slide"
              }
              onClick={() => select(active - 1)}
            >
              <ChevronLeft aria-hidden="true" size={20} />
            </button>
            <div className="hero-slide-dots">
              {slides.map((s, i) => (
                <button
                  type="button"
                  key={s.id}
                  aria-label={
                    locale === "ar"
                      ? `عرض الشريحة ${i + 1}`
                      : `Show slide ${i + 1}`
                  }
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => select(i)}
                >
                  <span />
                </button>
              ))}
            </div>
            {autoplay && !reduced && (
              <button
                type="button"
                aria-label={
                  paused
                    ? locale === "ar"
                      ? "تشغيل عرض الشرائح"
                      : "Play slideshow"
                    : locale === "ar"
                      ? "إيقاف عرض الشرائح مؤقتاً"
                      : "Pause slideshow"
                }
                onClick={() => setPaused((value) => !value)}
              >
                {paused ? (
                  <Play size={18} aria-hidden="true" />
                ) : (
                  <Pause size={18} aria-hidden="true" />
                )}
              </button>
            )}
            <button
              type="button"
              aria-label={locale === "ar" ? "الشريحة التالية" : "Next slide"}
              onClick={() => select(active + 1)}
            >
              <ChevronRight aria-hidden="true" size={20} />
            </button>
          </div>
        )}
        <span className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
    </>
  );
}
