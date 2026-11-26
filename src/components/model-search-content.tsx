import Link from "next/link";
import type { Locale } from "@/lib/catalog";
import styles from "./seo-content.module.css";
export function ModelSearchContent({
  locale,
  name,
  total,
  years,
  categoryName,
  modelHref,
  buyingNote,
}: {
  locale: Locale;
  name: string;
  total: number;
  years: number[];
  categoryName?: string;
  modelHref?: string;
  buyingNote?: string;
}) {
  const ar = locale === "ar";
  return (
    <section
      className={styles.content}
      aria-label={ar ? "دليل اختيار القطعة" : "Choosing a matching part"}
    >
      <h2>
        {categoryName
          ? (ar ? `دليل اختيار ${categoryName} ${name}` : `Choosing ${name} ${categoryName}`)
          : (ar ? `اختيار قطع غيار ${name}` : `Choosing ${name} spare parts`)}
      </h2>
      <p>
        {total
          ? ar
            ? `توجد ${total} نتيجة في الكتالوج مرتبطة بـ${categoryName ? `${categoryName} ` : "قطع غيار "}${name} في البحث الحالي. راجع رقم القطعة والموتور وأي استثناءات قبل الطلب.`
            : `The current catalog search has ${total} results for ${name} ${categoryName ?? "spare parts"}. Check part number, engine and any exclusions before ordering.`
          : ar
            ? "مفيش قطع منشورة مرتبطة بهذا الموديل حاليًا. تواصل معنا برقم القطعة وبيانات العربية للمراجعة؛ عدم وجود رابط توافق لا يعني أن القطعة مناسبة."
            : "No published parts are linked to this model yet. Send the part number and vehicle details for review; a missing compatibility record does not mean a part fits."}
      </p>
      {buyingNote && (
        <section aria-label={ar ? "نصائح لموديل العربية" : "Model-specific buying advice"}>
          <h3>{ar ? `إيه اللي تراجعه قبل شراء قطع ${name}؟` : `What to check for ${name} parts`}</h3>
          <p>{buyingNote}</p>
        </section>
      )}
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
      {categoryName && (
        <>
          <h3>{ar ? `قبل شراء ${categoryName} للعربية دي` : `Before buying ${categoryName} for this vehicle`}</h3>
          <p>
            {ar
              ? "ابدأ برقم القطعة المكتوب على القطعة القديمة أو العبوة، وطابقه مع الرقم والماركة الموجودين في صفحة المنتج. راجع مكان تركيب القطعة (أمامي أو خلفي، يمين أو شمال) لو مناسب لنوعها، ومحتويات العبوة والعدد قبل مقارنة الأسعار."
              : "Start with the reference number on the old part or its packaging, and compare it with the product number and maker. Check the fitting position (front or rear, left or right) where relevant, as well as package contents and quantity before comparing prices."}
          </p>
          <p>
            {ar
              ? "المنتجات اللي ملهاش سنوات محددة في الكتالوج لا يعني تلقائيًا إنها تناسب كل موتور أو فئة. نتيجة البحث وموديل العربية مش بديل عن التحقق من رقم القطعة ومواصفات العربية."
              : "A product listed without specific model years does not automatically fit every engine or trim. Search results and the model name alone are not a substitute for checking the part number and exact vehicle configuration."}
          </p>
        </>
      )}
      <h3>{ar ? "إزاي أتأكد من التوافق؟" : "How can I confirm fitment?"}</h3>
      <p>
        {ar
          ? "طابق رقم الشركة المصنعة ورقم القطعة القديمة، ثم راجع سنة الصنع ومواصفات العربية. اطلب مراجعة إذا كانت البيانات ناقصة."
          : "Match the manufacturer part number and old part number, then check the vehicle year and configuration. Request a review when details are incomplete."}
      </p>
      <nav
        className={styles.links}
        aria-label={ar ? "أدلة ومساعدة" : "Guides and assistance"}
      >
        {categoryName && modelHref && (
          <Link href={modelHref}>
            {ar ? `كل قطع غيار ${name}` : `All ${name} spare parts`}
          </Link>
        )}
        <Link href={`/${locale}/guides/item-brand-and-country-of-origin`}>
          {ar ? "ماركة القطعة وبلد المنشأ" : "Part maker and country of origin"}
        </Link>
        <Link href={`/${locale}/guides/compare-spare-part-prices`}>
          {ar ? "مقارنة الأسعار" : "Compare part prices"}
        </Link>
        <Link href={`/${locale}/guides/check-part-compatibility`}>
          {ar ? "دليل التوافق" : "Fitment guide"}
        </Link>
        <Link href={`/${locale}/guides/identify-vehicle-configuration`}>
          {ar ? "تحديد بيانات العربية" : "Identify your vehicle"}
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
