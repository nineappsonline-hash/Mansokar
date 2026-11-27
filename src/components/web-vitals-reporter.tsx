"use client";

import { useReportWebVitals } from "next/web-vitals";
import { webVitalInput, metricValue } from "@/lib/web-vitals";

// One report per metric update, only after explicit existing analytics consent.
// No cookies, user IDs, IP addresses, paths, query strings or referrers are sent.
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
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
  });
  return null;
}
