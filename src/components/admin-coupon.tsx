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
    <section className="panel stack admin-coupon-editor" lang="ar" dir="rtl">
      <h2>{initial.code ? "تعديل كوبون" : "إضافة كوبون جديد"}</h2>
      <p className="muted">
        العميل بيستخدم الكود أثناء إتمام الطلب. اختار خصم بالنسبة المئوية أو مبلغ ثابت بالجنيه المصري.
      </p>
      <ApiForm
        action="admin-coupon"
        label="حفظ الكوبون"
        extra={{
          json: JSON.stringify({
            ...value,
            amount: Number(amount) * (fixed ? 100 : 1),
          }),
        }}
      >
        <div className="merchant-form-fields">
          <label>
            كود الخصم
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
            نوع الخصم
            <select
              value={value.kind}
              onChange={(e) => {
                change("kind", e.target.value);
                setAmount("");
              }}
            >
              <option value="percentage">نسبة مئوية</option>
              <option value="fixed">مبلغ ثابت · جنيه</option>
            </select>
          </label>
          <label>
            {fixed ? "قيمة الخصم بالجنيه" : "نسبة الخصم المئوية"}
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
            الحد الأقصى لعدد مرات الاستخدام
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
            بداية صلاحية الكوبون (UTC)
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
            نهاية صلاحية الكوبون (UTC)
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
            عدد مرات الاستخدام لكل عميل (سيبه فاضي بدون حد)
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
        {value.starts_at && value.ends_at && new Date(value.ends_at).getTime() <= new Date(value.starts_at).getTime() && (
          <p className="notice" role="alert">تاريخ انتهاء الكوبون لازم يكون بعد تاريخ البداية.</p>
        )}
        {value.scope_category && (
          <div className="notice">
            <p>
              الكوبون ده مرتبط بمجموعة منتجات قديمة. هنحافظ على القيد ده إلا لو اخترت إزالته.
            </p>
            <label className="check">
              <input
                type="checkbox"
                onChange={() => change("scope_category", null)}
              />
              تطبيق الكوبون على كل المنتجات بدل المجموعة القديمة
            </label>
          </div>
        )}
      </ApiForm>
    </section>
  );
}
