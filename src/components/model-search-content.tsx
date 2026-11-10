import Link from "next/link";
import type { Locale } from "@/lib/catalog";
import styles from "./seo-content.module.css";
export function ModelSearchContent({
  locale,
  name,
  total,
  years,
}: {
  locale: Locale;
  name: string;
  total: number;
  years: number[];
}) {
  const ar = locale === "ar";
  return (
    <section
      className={styles.content}
      aria-label={ar ? "دليل اختيار القطعة" : "Choosing a matching part"}
    >
      <h2>{ar ? `اختيار قطع غيار ${name}` : `Choosing ${name} spare parts`}</h2>
      <p>
        {total
          ? ar
            ? `توجد ${total} نتيجة منشورة مرتبطة بهذا الموديل في كتالوج موبِك. اختار سنة سيارتك وراجع رقم القطعة والمحرك وأي استثناءات قبل الطلب.`
            : `The MOPC catalog has ${total} published results linked to this model. Choose your year and check the part number, engine and any exclusions before ordering.`
          : ar
            ? "لا توجد قطع منشورة مرتبطة بهذا الموديل حاليًا. تواصل معنا برقم القطعة وبيانات السيارة للمراجعة؛ عدم وجود رابط توافق لا يعني أن القطعة مناسبة."
            : "No published parts are linked to this model yet. Send the part number and vehicle details for review; a missing compatibility record does not mean a part fits."}
      </p>
      {years.length > 0 && (
        <details>
          <summary>
            {ar ? "سنوات مسجلة لهذا الموديل" : "Recorded model years"}
          </summary>
          <p>{[...new Set(years)].sort((a, b) => a - b).join(" · ")}</p>
          <p>
            {ar
              ? "السنوات المسجلة ليست دليلًا على توافر كل القطع أو توافقها."
              : "Recorded years do not prove that every part is available or compatible."}
          </p>
        </details>
      )}
      <h3>{ar ? "إزاي أتأكد من التوافق؟" : "How can I confirm fitment?"}</h3>
      <p>
        {ar
          ? "طابق رقم الشركة المصنعة ورقم القطعة القديمة، ثم راجع سنة الصنع وتكوين السيارة. اطلب مراجعة إذا كانت البيانات ناقصة."
          : "Match the manufacturer part number and old part number, then check the vehicle year and configuration. Request a review when details are incomplete."}
      </p>
      <nav
        className={styles.links}
        aria-label={ar ? "أدلة ومساعدة" : "Guides and assistance"}
      >
        <Link href={`/${locale}/guides/check-part-compatibility`}>
          {ar ? "دليل التوافق" : "Fitment guide"}
        </Link>
        <Link href={`/${locale}/guides/identify-vehicle-configuration`}>
          {ar ? "تحديد بيانات السيارة" : "Identify your vehicle"}
        </Link>
        <Link href={`/${locale}/request-part`}>
          {ar ? "طلب مراجعة قطعة" : "Request a part review"}
        </Link>
        <Link href={`/${locale}/contact`}>
          {ar
            ? "استفسار عن الشحن والإرجاع والضمان"
            : "Delivery, returns and warranty questions"}
        </Link>
      </nav>
    </section>
  );
}
