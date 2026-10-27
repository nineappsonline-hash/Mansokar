"use client";
import { useState } from "react";
import { money, type Locale } from "@/lib/catalog";
export function ShippingEstimate({
  areas,
  locale,
}: {
  areas: { id: string; name: string; governorate: string; amount: number }[];
  locale: Locale;
}) {
  const [id, setId] = useState("");
  const area = areas.find((a) => a.id === id);
  return (
    <section className="panel stack">
      <h3>{locale === "ar" ? "تقدير التوصيل" : "Delivery estimate"}</h3>
      {areas.length ? (
        <>
          <label>
            {locale === "ar" ? "المحافظة والمنطقة" : "Governorate & area"}
            <select value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">—</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.governorate} / {a.name}
                </option>
              ))}
            </select>
          </label>
          {area && <p aria-live="polite">{money(area.amount, locale)}</p>}
          <p className="muted">
            {locale === "ar"
              ? "السعر الأساسي للتوصيل. يتم تطبيق عروض الشحن والخصومات على السلة أثناء مراجعة الطلب."
              : "Base delivery rate. Shipping promotions and discounts are applied to your cart during order review."}
          </p>
        </>
      ) : (
        <p>
          {locale === "ar"
            ? "لم يتم اعتماد مناطق التوصيل بعد."
            : "Delivery coverage has not been approved yet."}
        </p>
      )}
    </section>
  );
}
