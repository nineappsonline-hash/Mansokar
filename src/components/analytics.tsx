"use client";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
  useEffect(() => {
    setConsent(localStorage.getItem("analytics-consent"));
  }, []);
  function choose(value: string) {
    localStorage.setItem("analytics-consent", value);
    document.cookie = `analytics-consent=${value};path=/;max-age=31536000;SameSite=Lax`;
    setConsent(value);
  }
  useEffect(() => {
    if (!enabled || consent !== "yes") return;
    const track = (event: string, product?: string) => {
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event, product }),
      }).catch(() => {});
    };
    if (path.includes("/products/")) track("view_item", path.split("/").at(-1));
    else if (path.endsWith("/catalog") && params.has("q")) track("search");
    else if (path.endsWith("/checkout")) track("begin_checkout");
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
  }, [enabled, consent, path, params]);
  if (!enabled || consent === "loading") return null;
  return consent === null ? (
    <aside
      className="consent-banner"
      aria-label={locale === "ar" ? "تفضيلات الخصوصية" : "Privacy preferences"}
    >
      <p>
        {locale === "ar"
          ? "هل تسمح بإحصاءات استخدام مجهولة لتحسين المتجر؟ لا نسجل بيانات التواصل أو نص البحث."
          : "Allow anonymous usage counts to improve the store? Contact details and search text are not recorded."}
      </p>
      <button className="button secondary" onClick={() => choose("no")}>
        {locale === "ar" ? "رفض" : "Reject"}
      </button>
      <button className="button" onClick={() => choose("yes")}>
        {locale === "ar" ? "موافقة" : "Accept"}
      </button>
    </aside>
  ) : (
    <button
      className="privacy-choice"
      onClick={() => {
        localStorage.removeItem("analytics-consent");
        document.cookie = "analytics-consent=;path=/;max-age=0;SameSite=Lax";
        setConsent(null);
      }}
    >
      {locale === "ar" ? "تفضيلات الخصوصية" : "Privacy preferences"}
    </button>
  );
}
