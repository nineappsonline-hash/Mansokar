"use client";
import { useState } from "react";
import { ApiForm } from "./forms";
import { shippingWindow } from "@/lib/shipping";
export function ShippingRateEditor({
  initial,
}: {
  initial: Record<string, any>;
}) {
  const [rate, setRate] = useState(
    initial.amount == null ? "" : String(initial.amount / 100),
  );
  const [enabled, setEnabled] = useState(Boolean(initial.enabled));
  const [name, setName] = useState(initial.name ?? "");
  const amount = rate.trim() === "" ? null : Math.round(Number(rate) * 100);
  return (
    <section className="panel stack">
      <h2>
        {initial.service_type === "express"
          ? "Express shipping"
          : "Normal shipping"}{" "}
        · {initial.governorate}
      </h2>
      <p>
        {shippingWindow(initial as any, "en") ||
          "Delivery time pending confirmation"}
      </p>
      <ApiForm
        action="admin-shipping"
        label="Save shipping rate"
        extra={{ json: JSON.stringify({ ...initial, name, enabled, amount }) }}
        disabled={enabled && amount === null}
      >
        <label>
          Delivery area name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </label>
        <label>
          Shipping rate · EGP (blank = not configured)
          <input
            type="number"
            min="0"
            step="0.01"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Enable this shipping option
        </label>
        <p className="muted">
          Enter the rate in Egyptian pounds. A rate of 0 means intentional free
          delivery. Unconfigured or disabled options are unavailable at
          checkout.
        </p>
      </ApiForm>
    </section>
  );
}
export function FreeShippingEditor({ amount }: { amount: number | null }) {
  const [value, setValue] = useState(
    amount == null ? "" : String(amount / 100),
  );
  return (
    <section className="panel stack">
      <h2>Free shipping threshold</h2>
      <ApiForm
        action="admin-free-shipping"
        label="Save free shipping threshold"
        extra={{
          json: JSON.stringify({
            free_shipping_threshold:
              value === "" ? null : Math.round(Number(value) * 100),
          }),
        }}
      >
        <label>
          Order threshold · EGP (blank disables)
          <input
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </label>
        <p className="muted">
          When enabled, the existing free-delivery rule applies to every
          available shipping option, including express.
        </p>
      </ApiForm>
    </section>
  );
}
