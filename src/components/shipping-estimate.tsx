"use client";
import {
  shippingGovernorates,
  shippingWindow,
  type ShippingArea,
} from "@/lib/shipping";
import { useState } from "react";
import { money, type Locale } from "@/lib/catalog";
import { Truck } from "lucide-react";
import styles from "./shipping-estimate.module.css";

export function ShippingEstimate({
  areas,
  locale,
}: {
  areas: ShippingArea[];
  locale: Locale;
}) {
  const [governorate, setGovernorate] = useState("");
  const groups = shippingGovernorates(areas, locale);
  const shown = groups.find((g) => g.value === governorate)?.areas ?? [];
  const ar = locale === "ar";
  return (
    <section
      className={styles.card}
      aria-label={ar ? "تقدير تكلفة التوصيل" : "Delivery estimate"}
    >
      <header className={styles.header}>
        <span className={styles.icon}>
          <Truck size={20} aria-hidden="true" />
        </span>
        <div>
          <h3>{ar ? "تكلفة التوصيل" : "Delivery estimate"}</h3>
          <p>
            {ar
              ? "تعرف على خيارات الشحن إلى محافظتك"
              : "Explore delivery options for your governorate"}
          </p>
        </div>
      </header>
      {groups.length > 0 ? (
        <>
          <label className={styles.field}>
            <span>{ar ? "المحافظة" : "Governorate"}</span>
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
            >
              <option value="">
                {ar ? "اختر المحافظة" : "Select governorate"}
              </option>
              {groups.map((g) => (
                <option value={g.value} key={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </label>
          <div aria-live="polite">
            {shown.length > 0 ? (
              <ul className={styles.rates}>
                {[...shown]
                  .sort(
                    (a, b) =>
                      Number(a.service_type === "express") -
                      Number(b.service_type === "express"),
                  )
                  .map((area) => (
                    <li key={area.id}>
                      <div>
                        <strong>
                          {area.service_type === "express"
                            ? ar
                              ? "توصيل سريع"
                              : "Express delivery"
                            : ar
                              ? "توصيل عادي"
                              : "Normal delivery"}
                        </strong>
                        {shippingWindow(area, locale) && (
                          <small>{shippingWindow(area, locale)}</small>
                        )}
                      </div>
                      <bdi>{money(area.amount, locale)}</bdi>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className={styles.hint}>
                {ar
                  ? "اختر محافظتك لعرض طرق التوصيل وتكلفة كل منها."
                  : "Choose your governorate to see delivery methods and their costs."}
              </p>
            )}
          </div>
        </>
      ) : (
        <p className={styles.hint}>
          {ar
            ? "لم تُعتمد مناطق التوصيل بعد."
            : "Delivery coverage has not been approved yet."}
        </p>
      )}
    </section>
  );
}
