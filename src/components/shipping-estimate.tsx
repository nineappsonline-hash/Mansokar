"use client";
import {
  shippingGovernorates,
  shippingWindow,
  type ShippingArea,
} from "@/lib/shipping";
import { useState } from "react";
import { money, type Locale } from "@/lib/catalog";
import { Truck, MapPin, Clock3, Zap } from "lucide-react";
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
  const selected = groups.find((group) => group.value === governorate);
  const shown = selected?.areas ?? [];
  const ar = locale === "ar";
  return (
    <section
      className={styles.card}
      aria-label={ar ? "تقدير تكلفة التوصيل" : "Delivery estimate"}
    >
      <header className={styles.header}>
        <span className={styles.icon}>
          <Truck size={23} aria-hidden="true" />
        </span>
        <div>
          <h3>{ar ? "احسب تكلفة التوصيل" : "Your delivery options"}</h3>
          <p>
            {ar
              ? "اختار محافظتك لعرض الرسوم ومدة التوصيل المتاحة."
              : "Choose your governorate to see available rates and delivery times."}
          </p>
        </div>
      </header>
      {groups.length > 0 ? (
        <div className={styles.body}>
          <div className={styles.destination}>
            <label className={styles.field}>
              <span>
                <MapPin size={14} aria-hidden="true" />
                {ar ? "وجهة التوصيل" : "Delivery destination"}
              </span>
              <select
                value={governorate}
                onChange={(event) => setGovernorate(event.target.value)}
              >
                <option value="">
                  {ar ? "اختار المحافظة" : "Select governorate"}
                </option>
                {groups.map((group) => (
                  <option value={group.value} key={group.value}>
                    {group.label}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.hint}>
              {ar
                ? "التكلفة تُضاف إلى إجمالي الطلب عند إتمام الشراء."
                : "Delivery is added to your order total at checkout."}
            </p>
          </div>
          <div className={styles.results} aria-live="polite" aria-atomic="true">
            {shown.length > 0 ? (
              <ul className={styles.rates}>
                {[...shown]
                  .sort(
                    (a, b) =>
                      Number(a.service_type === "express") -
                      Number(b.service_type === "express"),
                  )
                  .map((area) => {
                    const express = area.service_type === "express";
                    const deliveryWindow = shippingWindow(area, locale);
                    return (
                      <li key={area.id}>
                        <div className={styles.service}>
                          <span
                            className={
                              express ? styles.expressIcon : styles.methodIcon
                            }
                          >
                            {express ? (
                              <Zap size={16} aria-hidden="true" />
                            ) : (
                              <Truck size={17} aria-hidden="true" />
                            )}
                          </span>
                          <strong>
                            {express
                              ? ar
                                ? "توصيل سريع"
                                : "Express delivery"
                              : ar
                                ? "توصيل عادي"
                                : "Standard delivery"}
                          </strong>
                        </div>
                        <bdi className={styles.amount}>
                          {money(area.amount, locale)}
                        </bdi>
                        {deliveryWindow && (
                          <small className={styles.window}>
                            <Clock3 size={13} aria-hidden="true" />
                            {deliveryWindow}
                          </small>
                        )}
                      </li>
                    );
                  })}
              </ul>
            ) : (
              <div className={styles.empty}>
                <MapPin size={24} strokeWidth={1.5} aria-hidden="true" />
                <div>
                  <strong>
                    {ar ? "التوصيل لحد عندك" : "Delivered to your door"}
                  </strong>
                  <p>
                    {ar
                      ? "طرق التوصيل وأسعارها هتظهر هنا بعد اختيار المحافظة."
                      : "Available delivery methods and prices appear here once you select a governorate."}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className={styles.hint}>
          {ar
            ? "التوصيل مش متاح حاليًا."
            : "Delivery coverage has not been approved yet."}
        </p>
      )}
    </section>
  );
}
