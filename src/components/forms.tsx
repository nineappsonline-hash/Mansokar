"use client";
import commerce from "./commerce.module.css";
import {
  shippingGovernorates,
  shippingWindow,
  type ShippingArea,
} from "@/lib/shipping";
import { useEffect, useRef, useState } from "react";
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
  ArrowRight,
  Barcode,
  CreditCard,
  Headphones,
  Lock,
  Mail,
  MapPin,
  Package,
  Phone,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Ticket,
  Truck,
  Upload,
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
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || disabled) return;
        const locale =
          e.currentTarget.closest("[lang]")?.getAttribute("lang") === "ar"
            ? "ar"
            : "en";
        setBusy(true);
        setFailed(false);
        setMessage("");
        try {
          const form = new FormData(e.currentTarget);
          const body: Record<string, unknown> = {
            ui_locale: locale === "ar" ? "ar" : "en",
            locale: locale === "ar" ? "ar" : "en",
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
            locale === "ar"
              ? action === "auth" && body.mode === "signup"
                ? "افتح الإيميل وفعّل حسابك من رسالة التأكيد، وبعدها سجّل دخولك."
                : action === "contact"
                  ? "طلبك وصلنا. هنتواصل معاك على رقم الموبايل اللي سجلته."
                  : action === "request"
                    ? "طلبك وصلنا وهنراجعه."
                    : action === "privacy-request"
                      ? "طلب حذف بياناتك وصلنا وهنراجعه."
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
                detail: { event: "request_part_submitted" },
              }),
            );
          if (data.redirect) {
            if (action === "auth" || action === "logout") {
              window.location.assign(data.redirect);
              return;
            }
            if (
              new URL(data.redirect, window.location.origin).href !==
              window.location.href
            )
              router.push(data.redirect);
          }
          router.refresh();
        } catch (error) {
          setFailed(true);
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
      <p
        role={failed ? "alert" : "status"}
        className={
          failed ? "form-feedback form-feedback-error" : "form-feedback"
        }
        aria-live={failed ? "assertive" : "polite"}
      >
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
            ? "تسجيل الدخول مش متاح حاليًا. جرّب تاني بعد شوية."
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
          {locale === "ar" ? "العربية" : "Vehicle"}
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
              ? "عربيتي مش موجودة في القائمة"
              : "My vehicle is not listed"}
          </option>
        </select>
        {selectedVehicle === "other" && (
          <fieldset className="stack">
            <legend>
              {locale === "ar"
                ? "اكتب بيانات عربيتك علشان نساعدك نحدد القطعة"
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
              {locale === "ar" ? "الموتور" : "Engine"}
              <input name="engine" required maxLength={100} />
            </label>
            <p className="muted">
              {locale === "ar"
                ? "البيانات دي بتساعدنا نفهم طلبك، وفريقنا هيأكدلك القطعة المناسبة قبل الشراء."
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
  const [messageTone, setMessageTone] = useState<"error" | "success">("error");
  const [busy, setBusy] = useState(false);
  const [area, setArea] = useState("");
  const [governorate, setGovernorate] = useState("");
  const governorateOptions = shippingGovernorates(areas, locale);
  const deliveryOptions =
    governorateOptions.find((g) => g.value === governorate)?.areas ?? [];
  const selectedShipping = areas.find((item) => item.id === area);
  const [method, setMethod] = useState<PaymentMethod>(methods[0] ?? "cod");
  const [quote, setQuote] = useState<{
    items: {
      id: string;
      name: Record<Locale, string>;
      quantity: number;
      unit_price: number;
      total: number;
      sku?: string | null;
      manufacturer?: string | null;
      type?: "oem" | "aftermarket" | null;
      partNumber?: string | null;
      imageUrl?: string | null;
      vehicles?: { brand: string; model: { ar: string; en: string } | string; year: number }[];
    }[];
    subtotal: number;
    discount: number;
    shipping: number;
    total: number;
  } | null>(null);
  const [cartPreview, setCartPreview] = useState<{
    items: { id: string; name: Record<Locale, string>; quantity: number; price: number; imageUrl?: string | null }[];
    subtotal: number;
  } | null>(null);
  const [cartPreviewError, setCartPreviewError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let lines: { id: string; qty: number }[];
    try { lines = JSON.parse(localStorage.getItem("cart") || "[]"); }
    catch { setCartPreviewError(true); return; }
    if (!lines.length) {
      setCartPreview({ items: [], subtotal: 0 });
      return;
    }
    fetch("/api/products?ids=" + encodeURIComponent(lines.map((line) => line.id).join(",")) + "&locale=" + locale, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw Error("Products unavailable");
        return response.json();
      })
      .then((data) => {
        const products = data.products as Array<{ id: string; name: Record<Locale, string>; price: number; sale?: number | null; imageUrl?: string | null }>;
        if (lines.some((line) => !products.some((product) => product.id === line.id))) throw Error("Cart product missing");
        const items = lines.map((line) => {
          const product = products.find((p) => p.id === line.id)!;
          return { id: line.id, name: product.name, quantity: line.qty, price: product.sale ?? product.price, imageUrl: product.imageUrl };
        });
        setCartPreview({ items, subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0) });
      })
      .catch((error) => { if (error.name !== "AbortError") setCartPreviewError(true); });
    return () => controller.abort();
  }, [locale, cartVersion]);
  const [reviewed, setReviewed] = useState(false);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const [quoteInput, setQuoteInput] = useState({ phone: "", coupon: "" });
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [cartVersion, setCartVersion] = useState(0);
  useEffect(() => {
    const onCartChange = () => setCartVersion((value) => value + 1);
    window.addEventListener("store-change", onCartChange);
    window.addEventListener("storage", onCartChange);
    return () => {
      window.removeEventListener("store-change", onCartChange);
      window.removeEventListener("storage", onCartChange);
    };
  }, []);
  const router = useRouter();
  useEffect(() => {
    setQuote(null);
    setReviewed(false);
    if (!area || !/^01[0125][0-9]{8}$/.test(quoteInput.phone)) {
      setQuoteBusy(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setQuoteBusy(true);
      try {
        const response = await fetch("/api/checkout-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            phone: quoteInput.phone,
            area,
            coupon: quoteInput.coupon,
            items: JSON.parse(localStorage.getItem("cart") || "[]"),
          }),
        });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || "Unable to calculate order");
        setQuote(data);
        setReviewed(true);
        setMessage("");
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessageTone("error");
        setMessage(error instanceof Error ? error.message : "Unable to calculate order");
      } finally {
        if (!controller.signal.aborted) setQuoteBusy(false);
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [area, quoteInput.phone, quoteInput.coupon, cartVersion]);
  const step = reviewed ? 3 : area ? 2 : 1;
  const steps = [
    locale === "ar" ? "التوصيل" : "Delivery",
    locale === "ar" ? "الدفع" : "Payment",
    locale === "ar" ? "التأكيد" : "Confirm",
  ];
  return (
    <div className={`${commerce.commerce} ${commerce.checkout} checkout-page`}>
      <a className={commerce.backLink} href={`/${locale}/cart`}>
        <ShoppingBag size={15} />
        {locale === "ar" ? "العودة إلى السلة" : "Back to your bag"}
      </a>
      <header className="checkout-header">
        <span className="checkout-eyebrow">
          <Lock size={12} strokeWidth={2.4} />
          {locale === "ar" ? "طلب ودفع آمن" : "Secure checkout"}
        </span>
        <h1>{locale === "ar" ? "كمّل طلبك" : "Complete your order"}</h1>
        <p>
          {locale === "ar"
            ? "اكتب بيانات التوصيل واختار طريقة الدفع علشان تكمّل طلبك."
            : "Fill in delivery details and choose a payment method to place your order."}
        </p>
        <div className="checkout-header-meta">
          <span>
            <ShieldCheck size={14} strokeWidth={1.9} />
            {locale === "ar" ? "دفع آمن" : "Secure payment"}
          </span>
          <span>
            <RotateCcw size={14} strokeWidth={1.9} />
            {locale === "ar" ? "إرجاع سهل" : "Easy returns"}
          </span>
          <span>
            <Headphones size={14} strokeWidth={1.9} />
            {locale === "ar" ? "دعم الطلبات" : "Order support"}
          </span>
        </div>
      </header>

      <ol
        className="checkout-stepper"
        data-step={step}
        aria-label={locale === "ar" ? "مراحل إتمام الطلب" : "Checkout progress"}
      >
        {steps.map((label, index) => {
          const number = index + 1;
          const completed = number < step;
          const active = number === step;
          return (
            <li
              key={label}
              className={`checkout-step${completed ? " completed" : ""}${active ? " active" : ""}`}
              aria-current={active ? "step" : undefined}
            >
              <span className="checkout-step-number">
                {completed ? "✓" : number}
              </span>
              <span className="checkout-step-label">{label}</span>
            </li>
          );
        })}
      </ol>

      <form
        className="checkout-layout"
        ref={checkoutFormRef}
        onChange={(e) => {
          const target = e.target as unknown as { name?: string };
          if (
            target.name === "area" ||
            target.name === "governorate" ||
            target.name === "coupon"
          ) {
            setQuote(null);
            setReviewed(false);
          }
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
            if (!reviewed || !quote || quoteBusy)
              throw Error(locale === "ar" ? "استنى لحظة لحد ما نحسب الإجمالي النهائي." : "Please wait for the final total to be calculated.");
            let imageToken: string | undefined;
            if (isManualPayment(method)) {
              if (!(proof instanceof File) || !proof.size)
                throw Error(
                  locale === "ar"
                    ? "ارفع إيصال التحويل علشان تكمّل الطلب."
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
                    ? "مقدرناش نحفظ إيصال التحويل. جرّب تاني."
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
            setMessageTone("error");
            setMessage(
              error instanceof Error ? error.message : "Checkout failed",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="checkout-main">
          <section className="checkout-panel">
            <div className="checkout-panel-head">
              <span className="checkout-panel-icon">
                <MapPin size={20} strokeWidth={1.8} />
              </span>
              <div>
                <span className="checkout-panel-kicker">
                  {locale === "ar" ? "الخطوة ١" : "Step 1"}
                </span>
                <h2 className="checkout-panel-title">
                  {locale === "ar" ? "بيانات التوصيل" : "Delivery details"}
                </h2>
                <p className="checkout-panel-sub">
                  {locale === "ar"
                    ? "أدخل عنوان التوصيل وتفاصيل الاتصال."
                    : "Enter your delivery address and contact information."}
                </p>
              </div>
            </div>

            {addresses.length > 0 && (
              <div className="checkout-saved">
                <div className="checkout-saved-head">
                  <span className="checkout-saved-label">
                    {locale === "ar" ? "العناوين المحفوظة" : "Saved addresses"}
                  </span>
                  <span className="checkout-saved-hint">
                    {locale === "ar" ? "اضغط لملء البيانات" : "Tap to autofill"}
                  </span>
                </div>
                <div className="checkout-saved-grid">
                  {addresses.map((addr) => (
                    <button
                      type="button"
                      key={addr.id}
                      className="saved-address-card"
                      onClick={(e) => {
                        const form = e.currentTarget.form;
                        if (!form) return;
                        for (const [key, value] of Object.entries({
                          name: addr.name,
                          phone: addr.phone,
                          address: addr.details,
                        })) {
                          const field = form.elements.namedItem(
                            key,
                          ) as HTMLInputElement | null;
                          if (field) field.value = value;
                        }
                        const savedGovernorate = governorateOptions.find((g) =>
                          g.areas.some((a) => a.id === addr.area_id),
                        );
                        setQuoteInput((current) => ({ ...current, phone: addr.phone.trim() }));
                        setGovernorate(savedGovernorate?.value ?? "");
                        setArea(savedGovernorate ? addr.area_id! : "");
                        setMessage("");
                        setQuote(null);
                        setReviewed(false);
                      }}
                    >
                      <span className="saved-address-icon">
                        <MapPin size={16} strokeWidth={1.9} />
                      </span>
                      <span className="saved-address-info">
                        <span className="saved-address-name">{addr.name}</span>
                        <span className="saved-address-details">
                          {addr.details}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="checkout-field-grid">
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
                  <Phone size={14} strokeWidth={1.9} />
                  {locale === "ar"
                    ? "رقم موبايل مصري"
                    : "Egyptian mobile number"}
                </span>
                <input
                  name="phone"
                  onChange={(e) => setQuoteInput((current) => ({ ...current, phone: e.target.value.trim() }))}
                  required
                  pattern="01[0125][0-9]{8}"
                  dir="ltr"
                  autoComplete="tel"
                  placeholder="01xxxxxxxxx"
                  className="checkout-input"
                />
              </label>
              <label className="checkout-label checkout-field-full">
                <span>
                  <Mail size={14} strokeWidth={1.9} />
                  {locale === "ar"
                    ? "البريد الإلكتروني (اختياري)"
                    : "Email (optional)"}
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
              <label className="checkout-label checkout-field-full">
                <span>
                  <MapPin size={14} strokeWidth={1.9} />
                  {locale === "ar" ? "المحافظة" : "Governorate"}
                </span>
                <select
                  name="governorate"
                  required
                  value={governorate}
                  disabled={busy}
                  onChange={(e) => {
                    setGovernorate(e.target.value);
                    setArea("");
                    setMessage("");
                  }}
                  className="checkout-select"
                >
                  <option value="">
                    {locale === "ar" ? "اختار المحافظة" : "Select governorate"}
                  </option>
                  {governorateOptions.map((g) => (
                    <option value={g.value} key={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </label>
              {governorate && (
                <fieldset
                  className={`${commerce.deliveryChoices} checkout-field-full`}
                  disabled={busy}
                >
                  <legend>
                    {locale === "ar"
                      ? "اختار طريقة التوصيل"
                      : "Choose delivery method"}
                  </legend>
                  <div className={commerce.deliveryGrid}>
                    {[...deliveryOptions]
                      .sort(
                        (a, b) =>
                          Number(a.service_type === "express") -
                          Number(b.service_type === "express"),
                      )
                      .map((option) => (
                        <label
                          key={option.id}
                          className={`${commerce.deliveryOption} ${area === option.id ? commerce.deliverySelected : ""}`}
                        >
                          <input
                            type="radio"
                            name="area"
                            value={option.id}
                            checked={area === option.id}
                            required
                            onChange={() => {
                              setArea(option.id);
                              setMessage("");
                              window.dispatchEvent(
                                new CustomEvent("analytics-event", {
                                  detail: { event: "add_shipping_info" },
                                }),
                              );
                            }}
                          />
                          <span>
                            <strong>
                              {option.service_type === "express"
                                ? locale === "ar"
                                  ? "توصيل سريع"
                                  : "Express delivery"
                                : locale === "ar"
                                  ? "توصيل عادي"
                                  : "Normal delivery"}
                            </strong>
                            {shippingWindow(option, locale) && (
                              <small>{shippingWindow(option, locale)}</small>
                            )}
                          </span>
                          <b>{money(option.amount, locale)}</b>
                        </label>
                      ))}
                  </div>
                </fieldset>
              )}
            </div>

            {area && (
              <p className="checkout-hint">
                {locale === "ar"
                  ? "مدة التوصيل من تأكيد الطلب وتوافر المنتجات. أيام العمل مش بتشمل الجمعة والعطلات الرسمية."
                  : "Delivery time runs from order confirmation and product availability. Business days exclude Fridays and public holidays."}
              </p>
            )}
            {!areas.length && (
              <p className="notice checkout-notice">
                {locale === "ar"
                  ? "التوصيل مش متاح حاليًا، علشان كده مش ممكن نكمّل الطلب."
                  : "No approved delivery areas. Checkout is unavailable."}
              </p>
            )}

            <hr className="checkout-divider" />

            <label className="checkout-label">
              <span>
                <MapPin size={14} strokeWidth={1.9} />
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
                <Barcode size={14} strokeWidth={1.9} />
                {locale === "ar" ? "ملاحظات التوصيل" : "Delivery notes"}
              </span>
              <textarea
                name="notes"
                maxLength={1000}
                className="checkout-textarea"
                rows={3}
              />
            </label>
            <label className="checkout-label checkout-coupon">
              <span>
                <Ticket size={14} strokeWidth={1.9} />
                {locale === "ar" ? "كود الخصم" : "Coupon code"}
              </span>
              <input
                name="coupon"
                onChange={(e) => setQuoteInput((current) => ({ ...current, coupon: e.target.value.trim() }))}
                maxLength={40}
                className="checkout-input"
                placeholder={
                  locale === "ar" ? "اكتب كود الخصم" : "Enter coupon code"
                }
              />
            </label>
          </section>

          <section className="checkout-panel">
            <div className="checkout-panel-head">
              <span className="checkout-panel-icon">
                <CreditCard size={20} strokeWidth={1.8} />
              </span>
              <div>
                <span className="checkout-panel-kicker">
                  {locale === "ar" ? "الخطوة ٢" : "Step 2"}
                </span>
                <h2 className="checkout-panel-title">
                  {locale === "ar" ? "طريقة الدفع" : "Payment method"}
                </h2>
                <p className="checkout-panel-sub">
                  {locale === "ar"
                    ? "اختار طريقة الدفع المناسبة ليك. هتشوف الإجمالي قبل ما تأكد الطلب."
                    : "Choose how you'd like to pay. You can review the totals before confirming."}
                </p>
              </div>
            </div>

            <div className="payment-methods">
              {methods.length ? (
                <>
                  {methods.includes("card") && (
                    <div
                      className={`payment-method-card${method === "card" ? " selected" : ""}`}
                    >
                      <label className="payment-method-choice">
                        <input
                          className="payment-radio"
                          type="radio"
                          name="method"
                          value="card"
                          required
                          checked={method === "card"}
                          onChange={() => {
                            setMethod("card");
                            window.dispatchEvent(
                              new CustomEvent("analytics-event", {
                                detail: { event: "add_payment_info" },
                              }),
                            );
                          }}
                        />
                        <span className="payment-method-icon">
                          <CreditCard size={20} strokeWidth={1.8} />
                        </span>
                        <span className="payment-method-info">
                          <span className="payment-method-title">
                            {locale === "ar"
                              ? "بطاقة ائتمان أو تقسيط"
                              : "Credit card or installments"}
                          </span>
                          <span className="payment-method-sub">
                            {locale === "ar"
                              ? "دفع آمن عبر البطاقة أو أنظمة التقسيط"
                              : "Secure card payment or installment plans"}
                          </span>
                          <span className="payment-method-details-inline">
                            {InstallmentProviders.join(" · ")}
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                  {methods.includes("instapay") && (
                    <div
                      className={`payment-method-card${method === "instapay" ? " selected" : ""}`}
                    >
                      <label className="payment-method-choice">
                        <input
                          className="payment-radio"
                          type="radio"
                          name="method"
                          value="instapay"
                          required
                          checked={method === "instapay"}
                          onChange={() => {
                            setMethod("instapay");
                            window.dispatchEvent(
                              new CustomEvent("analytics-event", {
                                detail: { event: "add_payment_info" },
                              }),
                            );
                          }}
                        />
                        <span className="payment-method-icon">
                          <Smartphone size={20} strokeWidth={1.8} />
                        </span>
                        <span className="payment-method-info">
                          <span className="payment-method-title">
                            {locale === "ar" ? "إنستاباي" : "InstaPay"}
                          </span>
                          <span className="payment-method-sub">
                            {locale === "ar"
                              ? "حوّل المبلغ وبعدها ارفع صورة إيصال التحويل."
                              : "Transfer the amount, then upload a receipt."}
                          </span>
                        </span>
                      </label>
                      {method === "instapay" && (
                        <div className="payment-method-details">
                          <a
                            className="payment-link"
                            href={INSTAPAY_URL}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {locale === "ar"
                              ? "فتح رابط إنستاباي"
                              : "Open InstaPay link"}
                            <ArrowRight size={14} strokeWidth={2} />
                          </a>
                          <label className="checkout-file">
                            <span className="checkout-file-icon">
                              <Upload size={16} strokeWidth={1.9} />
                            </span>
                            <span className="checkout-file-text">
                              <strong>
                                {locale === "ar"
                                  ? "ارفع إيصال التحويل"
                                  : "Attach transfer receipt"}
                              </strong>
                              <small>
                                {locale === "ar"
                                  ? "صورة بصيغة PNG أو JPG"
                                  : "PNG or JPG image"}
                              </small>
                            </span>
                            <input
                              name="proof"
                              type="file"
                              accept="image/*"
                              required
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  {methods.includes("wallet") && (
                    <div
                      className={`payment-method-card${method === "wallet" ? " selected" : ""}`}
                    >
                      <label className="payment-method-choice">
                        <input
                          className="payment-radio"
                          type="radio"
                          name="method"
                          value="wallet"
                          required
                          checked={method === "wallet"}
                          onChange={() => {
                            setMethod("wallet");
                            window.dispatchEvent(
                              new CustomEvent("analytics-event", {
                                detail: { event: "add_payment_info" },
                              }),
                            );
                          }}
                        />
                        <span className="payment-method-icon">
                          <Mail size={20} strokeWidth={1.8} />
                        </span>
                        <span className="payment-method-info">
                          <span className="payment-method-title">
                            {locale === "ar" ? "محفظة إلكترونية" : "E-wallet"}
                          </span>
                          <span className="payment-method-sub">
                            {locale === "ar"
                              ? "حوّل المبلغ لرقم المحفظة وبعدها ارفع صورة الإيصال."
                              : "Transfer the amount to the wallet number, then upload a receipt."}
                          </span>
                        </span>
                      </label>
                      {method === "wallet" && (
                        <div className="payment-method-details">
                          <p>
                            {locale === "ar" ? "رقم المحفظة" : "Wallet number"}:{" "}
                            <strong dir="ltr">{WALLET_NUMBER}</strong>
                          </p>
                          <label className="checkout-file">
                            <span className="checkout-file-icon">
                              <Upload size={16} strokeWidth={1.9} />
                            </span>
                            <span className="checkout-file-text">
                              <strong>
                                {locale === "ar"
                                  ? "ارفع إيصال التحويل"
                                  : "Attach transfer receipt"}
                              </strong>
                              <small>
                                {locale === "ar"
                                  ? "صورة بصيغة PNG أو JPG"
                                  : "PNG or JPG image"}
                              </small>
                            </span>
                            <input
                              name="proof"
                              type="file"
                              accept="image/*"
                              required
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                  {methods.includes("cod") && (
                    <div
                      className={`payment-method-card${method === "cod" ? " selected" : ""}`}
                    >
                      <label className="payment-method-choice">
                        <input
                          className="payment-radio"
                          type="radio"
                          name="method"
                          value="cod"
                          required
                          checked={method === "cod"}
                          onChange={() => {
                            setMethod("cod");
                            window.dispatchEvent(
                              new CustomEvent("analytics-event", {
                                detail: { event: "add_payment_info" },
                              }),
                            );
                          }}
                        />
                        <span className="payment-method-icon">
                          <Truck size={20} strokeWidth={1.8} />
                        </span>
                        <span className="payment-method-info">
                          <span className="payment-method-title">
                            {locale === "ar"
                              ? "الدفع عند الاستلام"
                              : "Cash on delivery"}
                          </span>
                          <span className="payment-method-sub">
                            {locale === "ar"
                              ? "ادفع عند استلام الشحنة"
                              : "Pay when you receive your order"}
                          </span>
                        </span>
                      </label>
                    </div>
                  )}
                </>
              ) : (
                <p className="notice checkout-notice">
                  {locale === "ar"
                    ? "لسه مفيش طريقة دفع متاحة."
                    : "No payment method has been activated."}
                </p>
              )}
            </div>
          </section>
        </div>

        <aside className="checkout-sidebar">
          <section className="checkout-summary">
            <div className="checkout-summary-head">
              <div>
                <span className="checkout-panel-kicker">
                  {locale === "ar" ? "الخطوة ٣" : "Step 3"}
                </span>
                <h2>{locale === "ar" ? "ملخص الطلب" : "Order summary"}</h2>
              </div>
              <span className="checkout-summary-icon">
                <ShoppingBag size={20} strokeWidth={1.8} />
              </span>
            </div>

            {quote ? (
              <div aria-live="polite">
                <div className="order-items">
                  {quote.items.map((item) => (
                    <div key={item.id} className="order-item">
                      <div className="order-item-image">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name[locale]}
                            loading="lazy"
                          />
                        ) : (
                          <Package size={24} strokeWidth={2} />
                        )}
                      </div>
                      <div className="order-item-info">
                        <p className="order-item-name">{item.name[locale]}</p>
                        <div className="order-item-full-details">
                          {item.type && (
                            <span className="order-item-detail">
                              {locale === "ar" ? "النوع" : "Type"}:{" "}
                              {item.type === "oem"
                                ? (locale === "ar" ? "أصلي OEM" : "Original OEM")
                                : (locale === "ar" ? "بديل Aftermarket" : "Aftermarket")}
                            </span>
                          )}
                          {item.manufacturer && (
                            <span className="order-item-detail">
                              {locale === "ar" ? "الشركة المصنعة" : "Manufacturer"}: {item.manufacturer}
                            </span>
                          )}
                          {(item.partNumber || item.sku) && (
                            <span className="order-item-detail">
                              {locale === "ar" ? "رقم القطعة" : "Part number"}: {item.partNumber || item.sku}
                            </span>
                          )}
                          {item.vehicles && item.vehicles.length > 0 && (
                            <div className="order-item-fitments">
                              <strong>{locale === "ar" ? "السيارات المتوافقة" : "Compatible vehicles"}</strong>
                              {item.vehicles.map((vehicle, index) => (
                                <span key={index}>
                                  {vehicle.brand} · {typeof vehicle.model === "string" ? vehicle.model : vehicle.model[locale]} · {vehicle.year}
                                </span>
                              ))}
                            </div>
                          )}
                          <span className="order-item-detail">
                            {locale === "ar" ? "العدد" : "Quantity"}: {item.quantity}
                          </span>
                          <span className="order-item-detail">
                            {locale === "ar" ? "سعر الوحدة" : "Unit price"}: {money(item.unit_price, locale)}
                          </span>
                        </div>
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
                    <span className="label">
                      {locale === "ar" ? "الخصم" : "Discount"}
                    </span>
                    <span>− {money(quote.discount, locale)}</span>
                  </div>
                  <div className="order-line">
                    <span className="label">
                      {locale === "ar" ? "التوصيل" : "Delivery"}
                    </span>
                    <span>{money(quote.shipping, locale)}</span>
                  </div>
                  <div className="order-line total">
                    <span className="label">
                      {locale === "ar" ? "الإجمالي" : "Total"}
                    </span>
                    <span>{money(quote.total, locale)}</span>
                  </div>
                </div>
              </div>
            ) : cartPreview?.items.length ? (
              <div aria-live="polite">
                <div className="order-items">
                  {cartPreview.items.map((item) => (
                    <div key={item.id} className="order-item">
                      <div className="order-item-image">
                        {item.imageUrl ? <img src={item.imageUrl} alt={item.name[locale]} loading="lazy" /> : <Package size={24} />}
                      </div>
                      <div className="order-item-info">
                        <p className="order-item-name">{item.name[locale]}</p>
                        <span className="order-item-detail">{locale === "ar" ? "العدد" : "Quantity"}: {item.quantity}</span>
                        <span className="order-item-detail">{locale === "ar" ? "سعر الوحدة" : "Unit price"}: {money(item.price, locale)}</span>
                      </div>
                      <span className="order-item-price">{money(item.price * item.quantity, locale)}</span>
                    </div>
                  ))}
                </div>
                <div className="order-breakdown">
                  <div className="order-line"><span className="label">{t(locale).subtotal}</span><span>{money(cartPreview.subtotal, locale)}</span></div>
                  {selectedShipping && (
                    <div className="order-line">
                      <span className="label">{locale === "ar" ? "التوصيل (تقديري)" : "Delivery (estimate)"}</span>
                      <span>{money(selectedShipping.amount, locale)}</span>
                    </div>
                  )}
                  <p className="checkout-cta-note">{locale === "ar" ? "الإجمالي النهائي بيتحدث تلقائيًا بعد إدخال رقم موبايل صحيح. مصاريف التوصيل بتظهر بمجرد اختيار طريقة الشحن." : "Final total updates automatically once a valid phone number is entered. Delivery charges appear when a shipping option is selected."}</p>
                </div>
              </div>
            ) : (
              <div className="checkout-summary-empty">
                <ReceiptText size={18} strokeWidth={1.8} />
                <p>
                  {cartPreviewError ? (locale === "ar" ? "تعذر تحميل منتجات السلة. ارجع للسلة وتأكد من المنتجات." : "Could not load cart products. Please check your cart.") : locale === "ar"
                    ? "إجمالي المنتجات والتوصيل والخصم هيظهر هنا بعد مراجعة الطلب."
                    : "Your item totals, delivery and discounts will appear here after you review your order."}
                </p>
              </div>
            )}

            <div className="checkout-assurances">
              <div className="checkout-assurance">
                <ShieldCheck size={17} strokeWidth={1.9} />
                <span>
                  <strong>
                    {locale === "ar" ? "دفع آمن" : "Secure payment"}
                  </strong>
                  <small>
                    {locale === "ar"
                      ? "بيانات مشفرة ومحمية"
                      : "Encrypted and protected"}
                  </small>
                </span>
              </div>
              <div className="checkout-assurance">
                <RotateCcw size={17} strokeWidth={1.9} />
                <span>
                  <strong>
                    {locale === "ar" ? "إرجاع سهل" : "Easy returns"}
                  </strong>
                  <small>
                    {locale === "ar"
                      ? "سياسة إرجاع واضحة"
                      : "Simple, policy-backed returns"}
                  </small>
                </span>
              </div>
              <div className="checkout-assurance">
                <Headphones size={17} strokeWidth={1.9} />
                <span>
                  <strong>
                    {locale === "ar" ? "دعم الطلبات" : "Order support"}
                  </strong>
                  <small>
                    {locale === "ar"
                      ? "إحنا موجودين علشان نساعدك"
                      : "We're here if you need us"}
                  </small>
                </span>
              </div>
            </div>

            <hr className="checkout-divider" />

            <label className="checkout-consent">
              <input name="consent" type="checkbox" required value="yes" />
              <span>
                {locale === "ar"
                  ? "قرأت الشروط وسياسة الإرجاع"
                  : "I have read the terms and returns policy"}{" "}
                <a href={`/${locale}/policies/returns`}>
                  {locale === "ar" ? "سياسة الإرجاع" : "Returns policy"}
                </a>
              </span>
            </label>

            <button
              className="checkout-button"
              disabled={busy || quoteBusy || !methods.length || !area || !quote}
            >
              {busy || quoteBusy
                ? "…"
                : locale === "ar" ? "تأكيد الطلب" : "Confirm order"}
              {!busy && <ArrowRight size={17} strokeWidth={2.2} />}
            </button>
            {!quote && !busy && (
              <p className="checkout-cta-note">
                <Lock size={12} strokeWidth={2} />
                {locale === "ar"
                  ? "الإجمالي النهائي بيتحسب تلقائيًا بعد اختيار التوصيل وإدخال رقم الموبايل."
                  : "Review your final total before placing your order."}
              </p>
            )}
            {message && (
              <p className={`checkout-message ${messageTone}`} role="alert">
                {message}
              </p>
            )}
          </section>
        </aside>
      </form>
    </div>
  );
}
