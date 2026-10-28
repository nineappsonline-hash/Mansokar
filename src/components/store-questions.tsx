import Link from "next/link";
import { storeQuestions } from "@/lib/store-questions";
import type { Locale } from "@/lib/catalog";
export function StoreQuestions({ locale }: { locale: Locale }) {
  return (
    <div className="stack">
      {storeQuestions.map((q, i) => (
        <section className="stack" key={i}>
          <h2>{q.question[locale]}</h2>
          <p className="prose">{q.answer[locale]}</p>
        </section>
      ))}
      <Link href={`/${locale}/contact#callback`}>
        {locale === "ar"
          ? "سيب استفسارك وهنتواصل معاك"
          : "Leave an inquiry for a callback"}{" "}
        ↗
      </Link>
      <Link href={`/${locale}/guides`}>
        {locale === "ar" ? "أدلة الشراء" : "Buying guides"} ↗
      </Link>
      <Link href={`/${locale}/installments`}>
        {locale === "ar"
          ? "دليل الكروت والتقسيط"
          : "Cards and installments guide"}{" "}
        ↗
      </Link>
    </div>
  );
}
