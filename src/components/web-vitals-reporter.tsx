"use client";

import { useReportWebVitals } from "next/web-vitals";
import { useCallback, useEffect, useState } from "react";
import { webVitalInput, metricValue } from "@/lib/web-vitals";

// One report per metric update, only after explicit existing analytics consent.
// No cookies, user IDs, IP addresses, paths, query strings or referrers are sent.
export function WebVitalsReporter({ locale, showConsentUI }: { locale: "ar" | "en"; showConsentUI: boolean }) {
  const [consent, setConsent] = useState<"loading" | "yes" | "no" | null>("loading");
  useEffect(() => {
    const existing = localStorage.getItem("analytics-consent");
    setConsent(existing === "yes" || existing === "no" ? existing : null);
  }, []);
  const choose = (value: "yes" | "no") => {
    localStorage.setItem("analytics-consent", value);
    document.cookie = `analytics-consent=${value};path=/;max-age=31536000;SameSite=Lax`;
    setConsent(value);
  };
  useReportWebVitals(useCallback((metric) => {
    if (window.localStorage.getItem("analytics-consent") !== "yes") return;
    if (!["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) return;
    const parts = location.pathname.split("/").filter(Boolean);
    const locale = parts[0] === "en" ? "en" : "ar";
    const section = parts[1] || "";
    const page = !section ? "home"
      : section === "products" ? "product"
      : section === "catalog" ? "catalog"
      : section === "checkout" ? "checkout"
      : section === "brands" ? (parts.length > 3 ? "model" : "brand")
      : "other";
    const parsed = webVitalInput.safeParse({
      name: metric.name,
      value: metricValue(metric.name, metric.value),
      rating: metric.rating,
      page,
      locale,
      device: matchMedia("(max-width: 767px)").matches ? "mobile" : "desktop",
    });
    if (!parsed.success) return;
    const body = JSON.stringify(parsed.data);
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(
        "/api/web-vitals", new Blob([body], { type: "application/json" })
      )) return;
      fetch("/api/web-vitals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        credentials: "omit",
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Performance telemetry must never interrupt shopping.
    }
  }, []));
  if (!showConsentUI || consent === "loading") return null;
  if (consent === null) return (
    <aside className="consent-banner" aria-label={locale === "ar" ? "تفضيلات الخصوصية" : "Privacy preferences"}>
      <p>{locale === "ar"
        ? "تسمح بقياس سرعة الموقع بشكل مجهول لتحسين الأداء؟ بنقيس السرعة ونوع الصفحة فقط، من غير اسم أو بيانات تواصل أو عمليات شراء."
        : "Allow anonymous site-speed measurements to help improve performance? We measure timings and page categories, not identities or purchases."}</p>
      <button className="button secondary" onClick={() => choose("no")}>{locale === "ar" ? "رفض" : "Decline"}</button>
      <button className="button" onClick={() => choose("yes")}>{locale === "ar" ? "موافقة" : "Allow"}</button>
    </aside>
  );
  return (
    <button className="privacy-choice" onClick={() => {
      localStorage.removeItem("analytics-consent");
      document.cookie = "analytics-consent=;path=/;max-age=0;SameSite=Lax";
      setConsent(null);
    }}>{locale === "ar" ? "تفضيلات الخصوصية" : "Privacy preferences"}</button>
  );
}
