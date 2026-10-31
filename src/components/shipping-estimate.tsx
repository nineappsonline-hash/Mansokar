"use client";
import { governorates, shippingLabel, type ShippingArea } from "@/lib/shipping";
import { useState } from "react";
import { money, type Locale } from "@/lib/catalog";

function governorateFor(area: ShippingArea, locale: Locale) {
  return governorates.find(
    (g) => g.en === area.governorate || g.ar === area.governorate,
  )?.[locale] ?? area.governorate;
}

export function ShippingEstimate({
  areas,
  locale,
}: {
  areas: ShippingArea[];
  locale: Locale;
}) {
  const [governorate, setGovernorate] = useState("");

  const standard = areas.find(
    (a) =>
      a.service_type === "standard" &&
      governorateFor(a, "en") === governorate &&
      a.amount != null,
  );
  const express = areas.find(
    (a) =>
      a.service_type === "express" &&
      governorateFor(a, "en") === governorate &&
      a.amount != null,
  );

  const shown = governorate
    ? areas.filter(
        (a) => governorateFor(a, "en") === governorate && a.amount != null,
      )
    : [];

  const optionList = governorates.map((g) => {
    const matched = areas.find(
      (a) =>
        (a.governorate === g.en || a.governorate === g.ar) && a.amount != null,
    );
    return {
      value: g.en,
      label: g[locale],
      hasAny: Boolean(matched),
    };
  });

  return (
    <section className="panel stack">
      <h3>
        {locale === "ar" ? "تقدير التوصيل" : "Delivery estimate"}
      </h3>

      {areas.length ? (
        <>
          <label>
            {locale === "ar"
              ? "المحافظة"
              : "Governorate"}
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
            >
              <option value="">—</option>
              {optionList.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {shown.length ? (
            <ul
              aria-live="polite"
              className="shipping-estimate-results"
            >
              <li className="shipping-estimate-row">
                <span className="shipping-estimate-method">
                  {locale === "ar" ? "الشحن العادي" : "Standard delivery"}
                </span>
                <b className="shipping-estimate-cost">
                  {money(standard!.amount, locale)}
                </b>
              </li>
              {express && (
                <li className="shipping-estimate-row">
                  <span className="shipping-estimate-method">
                    {locale === "ar" ? "الشحن السريع" : "Express delivery"}
                  </span>
                  <b className="shipping-estimate-cost">
                    {money(express.amount, locale)}
                  </b>
                </li>
              )}
            </ul>
          ) : (
            <p>
              {locale === "ar"
                ? "لم يتم اعتماد مناطق التوصيل بعد."
                : "Delivery coverage has not been approved yet."}
            </p>
          )}
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
