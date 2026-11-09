"use client";
import { useState } from "react";
import { ApiForm } from "./forms";
export function AdminCoupon({ initial }: { initial: Record<string, any> }) {
  const [value, setValue] = useState(initial);
  const fixed = value.kind === "fixed";
  const [amount, setAmount] = useState(
    String(fixed ? initial.amount / 100 : initial.amount),
  );
  const change = (key: string, next: unknown) =>
    setValue((v: Record<string, any>) => ({ ...v, [key]: next }));
  return (
    <section className="panel stack">
      <h2>{initial.code ? "Edit coupon" : "Create a coupon"}</h2>
      <p className="muted">
        Customers enter this code at checkout. Choose a percentage or a discount
        in whole Egyptian pounds.
      </p>
      <ApiForm
        action="admin-coupon"
        label="Save coupon"
        extra={{
          json: JSON.stringify({
            ...value,
            amount: Number(amount) * (fixed ? 100 : 1),
          }),
        }}
      >
        <div className="merchant-form-fields">
          <label>
            Coupon code
            <input
              required
              maxLength={40}
              pattern="[A-Z0-9_-]{2,40}"
              value={value.code}
              onChange={(e) =>
                change("code", e.target.value.toUpperCase().trim())
              }
            />
          </label>
          <label>
            Discount type
            <select
              value={value.kind}
              onChange={(e) => {
                change("kind", e.target.value);
                setAmount("");
              }}
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed amount · EGP</option>
            </select>
          </label>
          <label>
            {fixed ? "Discount amount · EGP" : "Discount percentage"}
            <input
              type="number"
              required
              min={1}
              max={fixed ? 1_000_000_000 : 100}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Maximum total uses
            <input
              type="number"
              required
              min={1}
              step={1}
              value={value.max_redemptions}
              onChange={(e) =>
                change("max_redemptions", Number(e.target.value))
              }
            />
          </label>
          <label>
            Valid from (UTC)
            <input
              type="datetime-local"
              required
              value={value.starts_at.slice(0, 16)}
              onChange={(e) =>
                change(
                  "starts_at",
                  e.target.value
                    ? new Date(e.target.value + "Z").toISOString()
                    : "",
                )
              }
            />
          </label>
          <label>
            Valid until (UTC)
            <input
              type="datetime-local"
              required
              min={value.starts_at.slice(0, 16)}
              value={value.ends_at.slice(0, 16)}
              onChange={(e) =>
                change(
                  "ends_at",
                  e.target.value
                    ? new Date(e.target.value + "Z").toISOString()
                    : "",
                )
              }
            />
          </label>
          <label>
            Uses per customer (blank = no limit)
            <input
              type="number"
              min={1}
              step={1}
              value={value.per_customer_limit ?? ""}
              onChange={(e) =>
                change(
                  "per_customer_limit",
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
            />
          </label>
        </div>
        {value.scope_category && (
          <div className="notice">
            <p>
              This existing coupon is limited to a legacy product group. That
              restriction will be preserved.
            </p>
            <label className="check">
              <input
                type="checkbox"
                onChange={() => change("scope_category", null)}
              />
              Apply this coupon to all products instead
            </label>
          </div>
        )}
      </ApiForm>
    </section>
  );
}
