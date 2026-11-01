"use client";
import { shippingLabel, type ShippingArea } from "@/lib/shipping";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, Vehicle } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { t } from "@/lib/i18n";
import {
  InstallmentProviders,
  INSTAPAY_URL,
  WALLET_NUMBER,
  isManualPayment,
  type PaymentMethod,
} from "@/lib/payments";
import {
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Truck,
  Shield,
  BadgeCheck,
  Smartphone,
  Package,
  Barcode,
  Lock,
} from "lucide-react";
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
  allowSignup = true,
  destination = "account",
}: {
  locale: Locale;
  configured: boolean;
  allowSignup?: boolean;
  destination?: "account" | "admin";
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
        extra={{ locale, destination }}
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
        {allowSignup ? (
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
        ) : (
          <input type="hidden" name="mode" value="login" />
        )}
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
  methods,
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
  methods: PaymentMethod[];
  vehicle?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [area, setArea] = useState("");
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? "cod");
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
    <div className="checkout-page">
      <div className="checkout-header">
        <span className="checkout-eyebrow">
          {locale === "ar" ? "إتمام الطلب" : "Checkout"}
        </span>
        <h1>
          {locale === "ar" ? "إتمام طلبك" : "Complete your order"}
        </h1>
        <p>
          {locale === "ar"
            ? "أكمل بيانات التوصيل واختر طريقة الدفع لإتمام الطلب."
            : "Fill in delivery details and choose a payment method to place your order."}
        </p>
      </div>

      <div className="checkout-stepper">
        <div className="checkout-step completed">
          <div className="checkout-step-number">1</div>
          <div className="checkout-step-label">
            {locale === "ar" ? "التوصيل" : "Delivery"}
          </div>
        </div>
        <div className="checkout-step active">
          <div className="checkout-step-number">2</div>
          <div className="checkout-step-label">
            {locale === "ar" ? "الدفع" : "Payment"}
          </div>
        </div>
        <div className="checkout-step">
          <div className="checkout-step-number">3</div>
          <div className="checkout-step-label">
            {locale === "ar" ? "التأكيد" : "Confirm"}
          </div>
        </div>
      </div>

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
            const form = e.currentTarget;
            const formData = new FormData(form);
            const proof = formData.get("proof");
            formData.delete("proof");
            const fields = Object.fromEntries(formData);
            if (!methods.length)
              throw Error("No payment method has been enabled");
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
            let imageToken: string | undefined;
            if (isManualPayment(method)) {
              if (!(proof instanceof File) || !proof.size)
                throw Error(
                  locale === "ar"
                    ? "يرجى رفع إثبات التحويل لإتمام الطلب."
                    : "Please upload the transfer receipt to complete the order.",
                );
              const upload = new FormData();
              upload.append("image", proof);
              const uploadResponse = await fetch("/api/upload", {
                method: "POST",
                body: upload,
              });
              const uploadData = await uploadResponse.json();
              if (!uploadResponse.ok) throw Error(uploadData.error);
              imageToken = uploadData.token;
              if (!imageToken)
                throw Error(
                  locale === "ar"
                    ? "تعذر حفظ إثبات التحويل. يرجى المحاولة مرة أخرى."
                    : "Unable to save the transfer receipt. Please try again.",
                );
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
                method,
                imageToken,
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
            if (/^https?:\/\//.test(data.redirect))
              window.location.assign(data.redirect);
            else router.push(data.redirect);
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
        <div className="checkout-panel">
          <div className="checkout-panel-title">
            <MapPin size={18} strokeWidth={2} />
            {locale === "ar" ? "بيانات التوصيل" : "Delivery details"}
          </div>
          <div className="checkout-panel-sub">
            {locale === "ar"
              ? "أدخل عنوان التوصيل وتفاصيل الاتصال."
              : "Enter your delivery address and contact information."}
          </div>

          {addresses.length > 0 && (
            <div className="saved-addresses">
              <label className="checkout-label">
                <span>
                  {locale === "ar" ? "استخدام عنوان محفوظ" : "Use saved address"}
                </span>
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
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {addresses.map((addr) => (
                  <label key={addr.id} className="saved-address-card">
                    <input
                      type="radio"
                      name="saved-address"
                      value={addr.id}
                      readOnly
                    />
                    <div className="saved-address-info">
                      <p className="saved-address-name">{addr.name}</p>
                      <p className="saved-address-details">{addr.details}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="checkout-label">
            <span>{locale === "ar" ? "الاسم بالكامل" : "Full name"}</span>
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              className="checkout-input"
            />
          </label>
          <label className="checkout-label">
            <span>
              <Phone size={16} strokeWidth={2} style={{ marginRight: "8px" }} />
              {locale === "ar" ? "رقم موبايل مصري" : "Egyptian mobile number"}
            </span>
            <input
              name="phone"
              required
              pattern="01[0125][0-9]{8}"
              dir="ltr"
              autoComplete="tel"
              placeholder="01xxxxxxxxx"
              className="checkout-input"
            />
          </label>
          <label className="checkout-label">
            <span>
              <Mail size={16} strokeWidth={2} style={{ marginRight: "8px" }} />
              {locale === "ar" ? "البريد الإلكتروني (اختياري)" : "Email (optional)"}
            </span>
            <input
              name="email"
              type="email"
              maxLength={200}
              dir="ltr"
              autoComplete="email"
              placeholder="name@example.com"
              className="checkout-input"
            />
          </label>
          <label className="checkout-label">
            <span>
              <MapPin size={16} strokeWidth={2} style={{ marginRight: "8px" }} />
              {locale === "ar" ? "المحافظة وطريقة الشحن" : "Governorate & shipping method"}
            </span>
            <select
              name="area"
              required
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="checkout-select"
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
            <p className="muted" style={{ fontSize: "13px", marginTop: "4px" }}>
              {locale === "ar"
                ? "مدة التوصيل من تأكيد الطلب وتوافر المنتجات. أيام العمل لا تشمل الجمعة والعطلات الرسمية."
                : "Delivery time runs from order confirmation and product availability. Business days exclude Fridays and public holidays."}
            </p>
          )}
          {!areas.length && (
            <p className="notice" style={{ marginBottom: "20px" }}>
              {locale === "ar"
                ? "لا توجد مناطق توصيل معتمدة. الطلب غير متاح."
                : "No approved delivery areas. Checkout is unavailable."}
            </p>
          )}
          <hr className="section-divider" />
          <label className="checkout-label">
            <span>
              <Truck size={16} strokeWidth={2} style={{ marginRight: "8px" }} />
              {locale === "ar" ? "العنوان بالتفصيل" : "Detailed address"}
            </span>
            <textarea
              name="address"
              required
              minLength={10}
              maxLength={500}
              autoComplete="street-address"
              className="checkout-textarea"
            />
          </label>
          <label className="checkout-label">
            <span>
              <Barcode size={16} strokeWidth={2} style={{ marginRight: "8px" }} />
              {locale === "ar" ? "ملاحظات التوصيل" : "Delivery notes"}
            </span>
            <textarea name="notes" maxLength={1000} className="checkout-textarea" />
          </label>
          <label className="checkout-label">
            <span>
              <Lock size={16} strokeWidth={2} style={{ marginRight: "8px" }} />
              {locale === "ar" ? "كود الخصم" : "Coupon code"}
            </span>
            <input
              name="coupon"
              maxLength={40}
              className="checkout-input"
              placeholder={locale === "ar" ? "أدخل الكود" : "Enter coupon code"}
            />
          </label>
        </div>

        <aside className="checkout-panel">
          <div className="checkout-panel-title">
            <CreditCard size={18} strokeWidth={2} />
            {locale === "ar" ? "طريقة الدفع" : "Payment method"}
          </div>
          <div className="checkout-panel-sub">
            {locale === "ar"
              ? "اختر طريقة الدفع المناسبة لك."
              : "Choose how you'd like to pay."}
          </div>

          <div className="payment-methods">
            {methods.length ? (
              <>
                {methods.includes("card") && (
                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="method"
                      value="card"
                      required
                      checked={method === "card"}
                      onChange={() => setMethod("card")}
                    />
                    <div className="payment-method-icon">
                      <CreditCard size={20} strokeWidth={2} />
                    </div>
                    <div className="payment-method-info">
                      <p className="payment-method-title">
                        {locale === "ar"
                          ? "بطاقة ائتمان أو تقسيط"
                          : "Credit card or installments"}
                      </p>
                      <p className="payment-method-sub">
                        {locale === "ar"
                          ? "دفع آمن عبر البطاقة أو أنظمة التقسيط"
                          : "Secure card payment or installment plans"}
                      </p>
                      <p className="payment-method-details">
                        {InstallmentProviders.join(" · ")}
                      </p>
                    </div>
                  </label>
                )}
                {methods.includes("instapay") && (
                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="method"
                      value="instapay"
                      required
                      checked={method === "instapay"}
                      onChange={() => setMethod("instapay")}
                    />
                    <div className="payment-method-icon">
                      <Smartphone size={20} strokeWidth={2} />
                    </div>
                    <div className="payment-method-info">
                      <p className="payment-method-title">
                        {locale === "ar" ? "إنستاباي" : "InstaPay"}
                      </p>
                      <p className="payment-method-sub">
                        {locale === "ar"
                          ? "حوّل المبلغ ثم ارفع صورة إثبات التحويل."
                          : "Transfer the amount, then upload a receipt."}
                      </p>
                      {method === "instapay" && (
                        <div className="payment-method-details">
                          <a
                            href={INSTAPAY_URL}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--amber)", textDecoration: "underline", fontSize: "13px" }}
                          >
                            {locale === "ar"
                              ? "فتح رابط إنستاباي"
                              : "Open InstaPay link"}
                          </a>
                          <label style={{ display: "block", marginTop: "10px" }}>
                            {locale === "ar" ? "إثبات التحويل" : "Transfer receipt"}
                            <input
                              name="proof"
                              type="file"
                              accept="image/*"
                              required
                            className="checkout-input"
                          />
                          </label>
                        </div>
                      )}
                    </div>
                  </label>
                )}
                {methods.includes("wallet") && (
                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="method"
                      value="wallet"
                      required
                      checked={method === "wallet"}
                      onChange={() => setMethod("wallet")}
                    />
                    <div className="payment-method-icon">
                      <Mail size={20} strokeWidth={2} />
                    </div>
                    <div className="payment-method-info">
                      <p className="payment-method-title">
                        {locale === "ar" ? "محفظة إلكترونية" : "E-wallet"}
                      </p>
                      <p className="payment-method-sub">
                        {locale === "ar"
                          ? "حوّل المبلغ إلى رقم المحفظة ثم ارفع صورة إثبات التحويل."
                          : "Transfer the amount to the wallet number, then upload a receipt."}
                      </p>
                      {method === "wallet" && (
                        <div className="payment-method-details">
                          <p>
                            {locale === "ar" ? "رقم المحفظة" : "Wallet number"}:{" "}
                            <strong dir="ltr">{WALLET_NUMBER}</strong>
                          </p>
                          <label style={{ display: "block", marginTop: "10px" }}>
                            {locale === "ar" ? "إثبات التحويل" : "Transfer receipt"}
                            <input
                              name="proof"
                              type="file"
                              accept="image/*"
                              required
                            className="checkout-input"
                          />
                          </label>
                        </div>
                      )}
                    </div>
                  </label>
                )}
                {methods.includes("cod") && (
                  <label className="payment-method-card">
                    <input
                      type="radio"
                      name="method"
                      value="cod"
                      required
                      checked={method === "cod"}
                      onChange={() => setMethod("cod")}
                    />
                    <div className="payment-method-icon">
                      <Truck size={20} strokeWidth={2} />
                    </div>
                    <div className="payment-method-info">
                      <p className="payment-method-title">
                        {locale === "ar" ? "الدفع عند الاستلام" : "Cash on delivery"}
                      </p>
                      <p className="payment-method-sub">
                        {locale === "ar"
                          ? "ادفع عند استلام الشحنة"
                          : "Pay when you receive your order"}
                      </p>
                    </div>
                  </label>
                )}
              </>
            ) : (
              <p className="notice">
                {locale === "ar"
                  ? "لم يتم تفعيل أي طريقة دفع."
                  : "No payment method has been activated."}
              </p>
            )}
          </div>

          <hr className="section-divider" />

          <label className="checkout-label" style={{ marginBottom: "20px" }}>
            <input
              name="consent"
              type="checkbox"
              required
              value="yes"
            />
            <span>
              {locale === "ar"
                ? "قرأت الشروط وسياسة الإرجاع"
                : "I have read the terms and returns policy"}
            </span>{" "}
            <a
              href={`/${locale}/policies/returns`}
            >
              {locale === "ar" ? "سياسة الإرجاع" : "Returns policy"}
            </a>
          </label>

          {quote && (
            <section className="order-summary" aria-live="polite">
              <div className="order-summary-title">
                <BadgeCheck size={18} strokeWidth={2} />
                {locale === "ar" ? "مراجعة الطلب" : "Order review"}
              </div>
              <div className="order-items">
                {quote.items.map((item) => (
                  <div key={item.id} className="order-item">
                    <div className="order-item-image">
                      {item.id ? (
                        <img
                          src={`/product-media/${item.id}`}
                          alt={item.name[locale]}
                          loading="lazy"
                        />
                      ) : (
                        <Package size={24} strokeWidth={2} />
                      )}
                    </div>
                    <div className="order-item-info">
                      <p className="order-item-name">{item.name[locale]}</p>
                      <p className="order-item-meta">
                        {locale === "ar" ? "الكمية" : "Qty"}:{" "}
                            <span>{item.quantity}</span>
                      </p>
                    </div>
                    <span className="order-item-price">
                      {money(item.total, locale)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="order-breakdown">
                <div className="order-line">
                  <span className="label">{t(locale).subtotal}</span>
                  <span>{money(quote.subtotal, locale)}</span>
                </div>
                <div className="order-line">
                  <span className="label">{locale === "ar" ? "الخصم" : "Discount"}</span>
                  <span>− {money(quote.discount, locale)}</span>
                </div>
                <div className="order-line">
                  <span className="label">{locale === "ar" ? "التوصيل" : "Delivery"}</span>
                  <span>{money(quote.shipping, locale)}</span>
                </div>
                <div className="order-line total">
                  <span className="label">{locale === "ar" ? "الإجمالي" : "Total"}</span>
                  <span>{money(quote.total, locale)}</span>
                </div>
              </div>
              <div className="trust-badges">
                <div className="trust-badge">
                  <Shield size={16} strokeWidth={2} />
                  <span>{locale === "ar" ? "دفع آمن" : "Secure payment"}</span>
                </div>
                <div className="trust-badge">
                  <Lock size={16} strokeWidth={2} />
                  <span>{locale === "ar" ? "بيانات محمية" : "Data protected"}</span>
                </div>
              </div>
            </section>
          )}

          <button
            className="checkout-button"
            disabled={busy || !methods.length || !area}
          >
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
          {message && (
            <p className={`checkout-message error`} role="alert">{message}</p>
          )}
        </aside>
      </form>
    </div>
  );
}
