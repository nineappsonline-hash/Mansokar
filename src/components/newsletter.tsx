"use client";
import { useState } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import type { Locale } from "@/lib/catalog";
export function Newsletter({ locale }: { locale: Locale }) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const ar = locale === "ar";
  return (
    <div className="newsletter-copy">
      <h2>{ar ? "اشترك في عروضنا" : "Be first to know"}</h2>
      <p>
        {ar
          ? "كن أول من يعرف أحدث العروض والمنتجات"
          : "Get the latest offers and new arrivals."}
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const r = await fetch("/api/newsletter", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email, locale, consent: true }),
            });
            if (!r.ok) throw Error();
            setMessage(
              ar
                ? "تم الاشتراك بنجاح. شكرًا لاهتمامك بموبِك!"
                : "You’re subscribed. Thank you for choosing MOPC!",
            );
            setEmail("");
          } catch {
            setMessage(
              ar
                ? "تعذر الاشتراك الآن. حاول مرة أخرى."
                : "Unable to subscribe right now. Please try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="sr-only" htmlFor="newsletter-email">
          {ar ? "البريد الإلكتروني" : "Email address"}
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={ar ? "أدخل بريدك الإلكتروني" : "Your email address"}
        />
        <button disabled={busy} type="submit">
          {busy
            ? ar
              ? "جارٍ الاشتراك…"
              : "Joining…"
            : ar
              ? "اشتراك"
              : "Subscribe"}
          <Mail size={19} />
        </button>
      </form>
      <small>
        {ar
          ? "بالاشتراك توافق على استلام عروضنا وفق "
          : "By subscribing you agree to receive offers under our "}
        <Link href={`/${locale}/policies/privacy`}>
          {ar ? "سياسة الخصوصية" : "privacy policy"}
        </Link>
        .
      </small>
      <p className="newsletter-status" role="status">
        {message}
      </p>
    </div>
  );
}
