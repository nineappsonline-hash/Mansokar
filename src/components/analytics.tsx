"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { browserEventNames } from "@/lib/analytics-input";
import type { Locale } from "@/lib/catalog";
export function Analytics({
  locale,
  enabled,
}: {
  locale: Locale;
  enabled: boolean;
}) {
  const [consent, setConsent] = useState<string | null>("loading");
  const path = usePathname();
  const params = useSearchParams();
  const gaId = /^G-[A-Z0-9]+$/.test(process.env.NEXT_PUBLIC_GA4_ID || "")
    ? process.env.NEXT_PUBLIC_GA4_ID
    : undefined;
  useEffect(() => {
    setConsent(localStorage.getItem("analytics-consent"));
  }, []);
  function choose(value: string) {
    localStorage.setItem("analytics-consent", value);
    document.cookie = `analytics-consent=${value};path=/;max-age=31536000;SameSite=Lax`;
    if (gaId)
      (window as unknown as Record<string, unknown>)["ga-disable-" + gaId] =
        value !== "yes";
    setConsent(value);
  }
  useEffect(() => {
    if (!enabled || consent !== "yes") return;
    if (gaId) {
      const w = window as unknown as {
        dataLayer: unknown[];
        gtag?: (...args: unknown[]) => void;
        __mopcGaReady?: boolean;
      };
      w.dataLayer = w.dataLayer || [];
      w.gtag =
        w.gtag ||
        function () {
          w.dataLayer.push(arguments);
        };
      if (!w.__mopcGaReady) {
        w.gtag("js", new Date());
        w.gtag("config", gaId, {
          send_page_view: false,
          page_location: location.origin + path,
          page_referrer: document.referrer
            ? new URL(document.referrer).origin
            : "",
          allow_google_signals: false,
          allow_ad_personalization_signals: false,
        });
        w.__mopcGaReady = true;
      }
      w.gtag("set", {
        page_location: location.origin + path,
        page_referrer: document.referrer
          ? new URL(document.referrer).origin
          : "",
      });
      w.gtag("event", "page_view", {
        page_location: location.origin + path,
        page_title: document.title,
      });
    }
    const track = (event: string, product?: string) => {
      if (!(browserEventNames as readonly string[]).includes(event)) return;
      const segments = path.split("/").filter(Boolean);
      let source = "direct";
      try {
        const host = document.referrer
          ? new URL(document.referrer).hostname
          : "";
        source =
          /(^|\.)(chatgpt.com|perplexity.ai|claude.ai|copilot.microsoft.com)$/.test(
            host,
          )
            ? "ai_referral"
            : /(^|\.)(google.[a-z.]+|bing.com|duckduckgo.com)$/.test(host)
              ? "organic"
              : host && host !== location.hostname
                ? "referral"
                : "direct";
      } catch {
        source = "unknown";
      }
      const page_type =
        segments[1] === "brands"
          ? segments[2] && segments[3]
            ? "model"
            : "brand"
          : segments[1] === "products"
            ? "product"
            : segments[1] === "guides"
              ? "guide"
              : segments[1] === "catalog"
                ? "catalog"
                : segments[1] === "checkout"
                  ? "checkout"
                  : segments.length === 1
                    ? "home"
                    : "other";
      const make = segments[1] === "brands" ? segments[2] : params.get("make");
      const model =
        segments[1] === "brands" ? segments[3] : params.get("model");
      const year = Number(params.get("year"));
      const context = {
        locale,
        page_type,
        source,
        ...(make && /^[a-z0-9-]{1,80}$/.test(make) ? { make } : {}),
        ...(model && /^[a-z0-9-]{1,100}$/.test(model) ? { model } : {}),
        ...(year >= 1950 && year <= 2100 && Number.isInteger(year)
          ? { year }
          : {}),
      };
      const ga = (window as unknown as { gtag?: (...args: unknown[]) => void })
        .gtag;
      if (gaId && ga)
        ga("event", event, {
          ...context,
          ...(product ? { item_id: product } : {}),
          page_location: location.origin + path,
        });
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, product, context }),
      }).catch(() => {});
    };
    if (path.includes("/products/")) track("view_item", path.split("/").at(-1));
    else if (path.endsWith("/catalog") && params.has("q")) {
      track("search");
      const q = params.get("q") || "";
      if (/^[a-z0-9 .-]{3,60}$/i.test(q) && /\d/.test(q))
        track("part_number_searched");
    } else if (path.endsWith("/checkout")) track("begin_checkout");
    if (
      (path.includes("/brands/") && params.has("year")) ||
      params.has("vehicle")
    )
      track("vehicle_selected");
    if (
      path.includes("/products/") &&
      (params.has("vehicle") || params.has("year"))
    ) {
      const result = document.querySelector<HTMLElement>(
        "[data-compatibility-result]",
      )?.dataset.compatibilityResult;
      if (result) {
        track("compatibility_checked", path.split("/").at(-1));
        if (result === "confirmed")
          track("compatibility_confirmed", path.split("/").at(-1));
      }
    }
    const click = (event: MouseEvent) => {
      const target = (event.target as Element)?.closest(
        "[data-analytics]",
      ) as HTMLElement | null;
      if (target) track(target.dataset.analytics!, target.dataset.productid);
    };
    const custom = (event: Event) => track((event as CustomEvent).detail.event);
    document.addEventListener("click", click);
    window.addEventListener("analytics-event", custom);
    return () => {
      document.removeEventListener("click", click);
      window.removeEventListener("analytics-event", custom);
    };
  }, [enabled, consent, path, params, locale, gaId]);
  if (!enabled || consent === "loading") return null;
  return consent === null ? (
    <aside
      className="consent-banner"
      aria-label={locale === "ar" ? "تفضيلات الخصوصية" : "Privacy preferences"}
    >
      <p>
        {locale === "ar"
          ? gaId
            ? "هل تسمح بإحصاءات الاستخدام، ومنها Google Analytics، لتحسين المتجر؟ لا نرسل بيانات التواصل أو نص البحث."
            : "هل تسمح بإحصاءات الاستخدام لتحسين المتجر؟ لا نسجل بيانات التواصل أو نص البحث."
          : gaId
            ? "Allow usage analytics, including Google Analytics, to improve the store? We do not send contact details or search text."
            : "Allow usage counts to improve the store? Contact details and search text are not recorded."}
      </p>
      <button className="button secondary" onClick={() => choose("no")}>
        {locale === "ar" ? "رفض" : "Reject"}
      </button>
      <button className="button" onClick={() => choose("yes")}>
        {locale === "ar" ? "موافقة" : "Accept"}
      </button>
    </aside>
  ) : (
    <>
      {consent === "yes" && gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
        </>
      )}
      <button
        className="privacy-choice"
        onClick={() => {
          localStorage.removeItem("analytics-consent");
          document.cookie = "analytics-consent=;path=/;max-age=0;SameSite=Lax";
          if (gaId)
            (window as unknown as Record<string, unknown>)[
              "ga-disable-" + gaId
            ] = true;
          setConsent(null);
        }}
      >
        {locale === "ar" ? "تفضيلات الخصوصية" : "Privacy preferences"}
      </button>
    </>
  );
}
