"use client";
import { shippingLabel, type ShippingArea } from "@/lib/shipping";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, Vehicle } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { t } from "@/lib/i18n";
export function ApiForm({
  action,
  children,
  label,
  extra = {},
  disabled = false,
}: {
  action: string;
  children?: React.ReactNode;
  label: string;
  extra?: Record<string, unknown>;
  disabled?: boolean;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage("");
        try {
          const form = new FormData(e.currentTarget);
          const body: Record<string, unknown> = {
            ui_locale: document.documentElement.lang === "ar" ? "ar" : "en",
            locale: document.documentElement.lang === "ar" ? "ar" : "en",
            ...Object.fromEntries(form),
            ...extra,
          };
          const image = form.get("image");
          if (image instanceof File && image.size) {
            const upload = new FormData();
            upload.append("image", image);
            const response = await fetch("/api/upload", {
              method: "POST",
              body: upload,
            });
            const result = await response.json();
            if (!response.ok) throw Error(result.error);
            body.imageToken = result.token;
          }
          delete body.image;
          const response = await fetch("/api/" + action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (!response.ok) throw Error(data.error);
          setMessage(
            document.documentElement.lang === "ar"
              ? action === "auth" && body.mode === "signup"
                ? "راجع بريدك الإلكتروني لتأكيد الحساب، ثم قم بتسجيل الدخول."
                : action === "contact"
                  ? "تم استلام طلبك. سنتواصل معك على الرقم المسجل."
                  : action === "request"
                    ? "تم حفظ طلبك للمراجعة."
                    : action === "privacy-request"
                      ? "تم حفظ طلب حذف البيانات للمراجعة."
                      : "تم الحفظ."
              : data.message || "Saved",
          );
          if (action === "auth") {
            const vehicle = document.cookie
              .split("; ")
              .find((v) => v.startsWith("vehicle="))
              ?.split("=")[1];
            if (vehicle)
              await fetch("/api/garage-active", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ vehicle: decodeURIComponent(vehicle) }),
              }).catch(() => {});
          }
          if (action === "request")
            window.dispatchEvent(
              new CustomEvent("analytics-event", {
                detail: { event: "part_request" },
              }),
            );
          if (data.redirect) {
            if (action === "auth" || action === "logout") {
              window.location.assign(data.redirect);
              return;
            }
            router.push(data.redirect);
          }
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Request failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="button" disabled={busy || disabled}>
        {busy ? "…" : label}
      </button>
      <p role="status" aria-live="polite">
        {message}
      </p>
    </form>
  );
}
export function AuthForm({
  locale,
  configured,
}: {
  locale: Locale;
  configured: boolean;
}) {
  return (
    <div className="panel narrow">
      <h2>{locale === "ar" ? "تسجيل الدخول" : "Sign in"}</h2>
      {!configured && (
        <p className="notice">
          {locale === "ar"
            ? "يلزم إعداد Supabase لتفعيل الحسابات."
            : "Supabase setup is required to enable accounts."}
        </p>
      )}
      <ApiForm
        action="auth"
        label={locale === "ar" ? "دخول" : "Sign in"}
        extra={{ locale }}
      >
        <label>
          {locale === "ar" ? "البريد الإلكتروني" : "Email"}
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            maxLength={254}
          />
        </label>
        <label>
          {locale === "ar" ? "كلمة المرور" : "Password"}
          <input
            name="password"
            type="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete="current-password"
          />
        </label>
        <label>
          {locale === "ar" ? "الإجراء" : "Action"}
          <select name="mode">
            <option value="login">
              {locale === "ar" ? "تسجيل الدخول" : "Sign in"}
            </option>
            <option value="signup">
              {locale === "ar" ? "إنشاء حساب" : "Create account"}
            </option>
          </select>
        </label>
      </ApiForm>
    </div>
  );
}
export function RequestForm({
  locale,
  vehicles,
}: {
  locale: Locale;
  vehicles: Vehicle[];
}) {
  const [selectedVehicle, setSelectedVehicle] = useState(
    vehicles[0]?.id ?? "other",
  );
  return (
    <div className="panel narrow">
      <ApiForm
        action="request"
        label={locale === "ar" ? "إرسال الطلب" : "Send inquiry"}
      >
        <label>
          {locale === "ar" ? "وسيلة التواصل" : "Contact email or phone"}
          <input name="contact" required minLength={6} maxLength={254} />
        </label>
        <label htmlFor="request-vehicle">
          {locale === "ar" ? "السيارة" : "Vehicle"}
        </label>
        <select
          id="request-vehicle"
          name="vehicle"
          value={selectedVehicle}
          onChange={(e) => setSelectedVehicle(e.target.value)}
        >
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name[locale]}
            </option>
          ))}
          <option value="other">
            {locale === "ar"
              ? "سيارتي غير موجودة بالقائمة"
              : "My vehicle is not listed"}
          </option>
        </select>
        {selectedVehicle === "other" && (
          <fieldset className="stack">
            <legend>
              {locale === "ar"
                ? "صف سيارتك للمراجعة اليدوية"
                : "Describe your vehicle for manual review"}
            </legend>
            <label htmlFor="request-make">
              {locale === "ar" ? "العلامة" : "Make"}
            </label>
            <select name="make" id="request-make">
              <option value="opel">Opel / أوبل</option>
              <option value="peugeot">Peugeot / بيجو</option>
              <option value="citroen">Citroën / سيتروين</option>
              <option value="mg">MG / إم جي</option>
            </select>
            <label>
              {locale === "ar" ? "الموديل" : "Model"}
              <input name="model" required maxLength={100} />
            </label>
            <label>
              {locale === "ar" ? "السنة" : "Year"}
              <input name="year" type="number" required min={1950} max={2100} />
            </label>
            <label>
              {locale === "ar" ? "المحرك" : "Engine"}
              <input name="engine" required maxLength={100} />
            </label>
            <p className="muted">
              {locale === "ar"
                ? "هذه البيانات لوصف الطلب فقط ولا تؤكد توافق أي قطعة."
                : "These details describe your inquiry and do not confirm compatibility with any part."}
            </p>
          </fieldset>
        )}
        <label>
          {locale === "ar" ? "صف القطعة" : "Describe the part"}
          <textarea
            name="description"
            required
            minLength={10}
            maxLength={3000}
          />
        </label>
        <label className="check">
          <input type="checkbox" name="consent" value="yes" required />
          {locale === "ar"
            ? "أوافق على استخدام بياناتي للرد على الطلب"
            : "I consent to my details being used to respond to this inquiry."}
        </label>
        <label>
          {locale === "ar"
            ? "صورة اختيارية · حتى ٥ ميجابايت"
            : "Optional photo · maximum 5 MB"}
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
          />
        </label>
      </ApiForm>
    </div>
  );
}
export function Checkout({
  locale,
  areas,
  enabled,
  vehicle,
  addresses = [],
}: {
  addresses?: {
    id: string;
    name: string;
    phone: string;
    details: string;
    area_id?: string;
  }[];
  locale: Locale;
  areas: ShippingArea[];
  enabled: boolean;
  vehicle?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [area, setArea] = useState("");
  const [quote, setQuote] = useState<{
    items: {
      id: string;
      name: Record<Locale, string>;
      quantity: number;
      unit_price: number;
      total: number;
    }[];
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  } | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const router = useRouter();
  return (
    <form
      className="two-col"
      onChange={() => {
        setQuote(null);
        setReviewed(false);
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const fields = Object.fromEntries(new FormData(e.currentTarget));
          if (!reviewed || !quote) {
            const response = await fetch("/api/checkout-quote", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...fields,
                locale,
                items: JSON.parse(localStorage.getItem("cart") || "[]"),
              }),
            });
            const data = await response.json();
            if (!response.ok) throw Error(data.error);
            setQuote(data);
            setReviewed(true);
            setMessage(
              locale === "ar"
                ? "راجع إجمالي الطلب ثم أكد الطلب."
                : "Review the totals, then confirm your order.",
            );
            return;
          }
          let key = sessionStorage.getItem("checkout-key");
          if (!key) {
            key = crypto.randomUUID();
            sessionStorage.setItem("checkout-key", key);
          }
          const response = await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...fields,
              vehicle,
              review_total: quote.total,
              items: JSON.parse(localStorage.getItem("cart") || "[]"),
              key,
              locale,
            }),
          });
          const data = await response.json();
          if (!response.ok) throw Error(data.error);
          localStorage.setItem("cart", "[]");
          window.dispatchEvent(new Event("store-change"));
          sessionStorage.removeItem("checkout-key");
          router.push(data.redirect);
        } catch (error) {
          setQuote(null);
          setReviewed(false);
          setMessage(
            error instanceof Error ? error.message : "Checkout failed",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="panel stack">
        <h2>{locale === "ar" ? "بيانات التوصيل" : "Delivery details"}</h2>
        {addresses.length > 0 && (
          <label>
            {locale === "ar" ? "استخدام عنوان محفوظ" : "Use saved address"}
            <select
              defaultValue=""
              onChange={(e) => {
                const saved = addresses.find((a) => a.id === e.target.value);
                const form = e.currentTarget.form;
                if (!saved || !form) return;
                for (const [key, value] of Object.entries({
                  name: saved.name,
                  phone: saved.phone,
                  address: saved.details,
                })) {
                  const field = form.elements.namedItem(
                    key,
                  ) as HTMLInputElement;
                  field.value = value;
                }
                if (saved.area_id) setArea(saved.area_id);
                setQuote(null);
                setReviewed(false);
              }}
            >
              <option value="">—</option>
              {addresses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.details}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {locale === "ar" ? "الاسم بالكامل" : "Full name"}
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label>
          {locale === "ar" ? "رقم موبايل مصري" : "Egyptian mobile number"}
          <input
            name="phone"
            required
            pattern="01[0125][0-9]{8}"
            dir="ltr"
            autoComplete="tel"
            placeholder="01xxxxxxxxx"
          />
        </label>
        <label>
          {locale === "ar"
            ? "المحافظة وطريقة الشحن"
            : "Governorate & shipping method"}
          <select
            name="area"
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
          >
            <option value="">—</option>
            {areas.map((a) => (
              <option value={a.id} key={a.id}>
                {shippingLabel(a, locale)} · {money(a.amount, locale)}
              </option>
            ))}
          </select>
        </label>
        {area && (
          <p className="muted">
            {locale === "ar"
              ? "مدة التوصيل من تأكيد الطلب وتوافر المنتجات. أيام العمل لا تشمل الجمعة والعطلات الرسمية."
              : "Delivery time runs from order confirmation and product availability. Business days exclude Fridays and public holidays."}
          </p>
        )}
        {!areas.length && (
          <p className="notice">
            {locale === "ar"
              ? "لا توجد مناطق توصيل معتمدة. الطلب غير متاح."
              : "No approved delivery areas. Checkout is unavailable."}
          </p>
        )}
        <label>
          {locale === "ar" ? "العنوان بالتفصيل" : "Detailed address"}
          <textarea
            name="address"
            required
            minLength={10}
            maxLength={500}
            autoComplete="street-address"
          />
        </label>
        <label>
          {locale === "ar" ? "ملاحظات التوصيل" : "Delivery notes"}
          <textarea name="notes" maxLength={1000} />
        </label>
        <label>
          {locale === "ar" ? "كود الخصم" : "Coupon"}
          <input name="coupon" maxLength={40} />
        </label>
      </div>
      <aside className="panel stack">
        <h2>{locale === "ar" ? "طريقة الدفع" : "Payment method"}</h2>
        {enabled ? (
          <label className="check">
            <input
              type="radio"
              name="method"
              value="cod"
              required
              defaultChecked
            />
            {locale === "ar" ? "الدفع عند الاستلام" : "Cash on delivery"}
          </label>
        ) : (
          <p className="notice">
            {locale === "ar"
              ? "لم يتم تفعيل أي طريقة دفع."
              : "No payment method has been activated."}
          </p>
        )}
        <p className="muted">
          {locale === "ar"
            ? "الدفع بالبطاقات وإنستاباي والمحافظ والتقسيط غير متاح لحين اعتماد مقدم الخدمة."
            : "Cards, InstaPay, wallets and installments are unavailable pending approved provider integration."}
        </p>
        <p>
          {locale === "ar"
            ? "سيتم التحقق من الأسعار والتوصيل والخصم على الخادم. لن يتم خصم أي مبلغ إلكترونياً."
            : "Prices, delivery and discounts are validated on the server. No online charge will be made."}
        </p>
        <label className="check">
          <input name="consent" type="checkbox" required value="yes" />
          {locale === "ar"
            ? "قرأت الشروط وسياسة الإرجاع"
            : "I have read the terms and returns policy"}
        </label>
        <a href={`/${locale}/policies/returns`}>
          {locale === "ar" ? "سياسة الإرجاع" : "Returns policy"}
        </a>
        {quote && (
          <section aria-live="polite" className="stack">
            <h2>{locale === "ar" ? "مراجعة الطلب" : "Order review"}</h2>
            {quote.items.map((item) => (
              <div key={item.id} className="cart-row">
                <span>
                  {item.name[locale]} × {item.quantity}
                  <small> · {money(item.unit_price, locale)}</small>
                </span>
                <strong>{money(item.total, locale)}</strong>
              </div>
            ))}
            <p>
              {t(locale).subtotal}: {money(quote.subtotal, locale)}
            </p>
            <p>
              {locale === "ar" ? "الخصم" : "Discount"}: −
              {money(quote.discount, locale)}
            </p>
            <p>
              {locale === "ar" ? "التوصيل" : "Delivery"}:{" "}
              {money(quote.shipping, locale)}
            </p>
            <p className="price">
              {locale === "ar" ? "الإجمالي" : "Total"}:{" "}
              {money(quote.total, locale)}
            </p>
          </section>
        )}
        <button className="button" disabled={busy || !enabled || !area}>
          {busy
            ? "…"
            : reviewed
              ? locale === "ar"
                ? "تأكيد الطلب"
                : "Confirm order"
              : locale === "ar"
                ? "مراجعة الأسعار والتوصيل"
                : "Review prices & delivery"}
        </button>
        <p role="alert">{message}</p>
      </aside>
    </form>
  );
}
