"use client";
import { governorates, shippingLabel, type ShippingArea } from "@/lib/shipping";
import { useState } from "react";
import { money, type Locale } from "@/lib/catalog";
import { Truck, MapPin, ChevronRight } from "lucide-react";

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
    <section className="shipping-estimate">
      <div className="shipping-estimate-header">
        <div className="shipping-estimate-icon">
          <Truck size={20} strokeWidth={2} />
        </div>
        <div>
          <h3>
            {locale === "ar" ? "تقدير التكلفة" : "Delivery estimate"}
          </h3>
          <p className="shipping-estimate-sub">
            {locale === "ar"
              ? "احسب تكلفة التوصيل حسب منطقتك"
              : "Calculate delivery cost to your area"}
          </p>
        </div>
      </div>

      {areas.length ? (
        <>
          <label className="shipping-estimate-label">
            <span className="shipping-estimate-label-text">
              {locale === "ar" ? "المحافظة" : "Governorate"}
            </span>
            <MapPin size={16} strokeWidth={2} className="shipping-estimate-label-icon" />
            <select
              value={governorate}
              onChange={(e) => setGovernorate(e.target.value)}
              className="shipping-estimate-select"
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
            <ul className="shipping-estimate-results">
              <li className="shipping-estimate-row">
                <span className="shipping-estimate-method">
                  <Truck size={14} strokeWidth={2} className="shipping-estimate-method-icon" />
                  {locale === "ar" ? "الشحن العادي" : "Standard delivery"}
                </span>
                <div className="shipping-estimate-cost-group">
                  <b className="shipping-estimate-cost">
                    {money(standard!.amount, locale)}
                  </b>
                  <span className="shipping-estimate-arrow">
                    <ChevronRight size={12} strokeWidth={2} />
                  </span>
                </div>
              </li>
              {express && (
                <li className="shipping-estimate-row">
                  <span className="shipping-estimate-method">
                    <Truck size={14} strokeWidth={2} className="shipping-estimate-method-icon" />
                    {locale === "ar" ? "الشحن السريع" : "Express delivery"}
                  </span>
                  <div className="shipping-estimate-cost-group">
                    <b className="shipping-estimate-cost">
                      {money(express.amount, locale)}
                    </b>
                    <span className="shipping-estimate-arrow">
                      <ChevronRight size={12} strokeWidth={2} />
                    </span>
                  </div>
                </li>
              )}
            </ul>
          ) : (
            <p className="shipping-estimate-none">
              {locale === "ar"
                ? "لم يتم اعتماد مناطق التوصيل بعد."
                : "Delivery coverage has not been approved yet."}
            </p>
          )}
        </>
      ) : (
        <p className="shipping-estimate-none">
          {locale === "ar"
            ? "لم يتم اعتماد مناطق التوصيل بعد."
            : "Delivery coverage has not been approved yet."}
        </p>
      )}
    </section>
  );
}
