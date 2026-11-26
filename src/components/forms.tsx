"use client";
import commerce from "./commerce.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale, Vehicle } from "@/lib/catalog";
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
