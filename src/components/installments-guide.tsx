import Link from "next/link";
import type { Locale } from "@/lib/catalog";

export const installmentProviders = [
  { en: "Valu", ar: "ڤاليو" },
  { en: "Souhoola (Suhoola)", ar: "سهولة" },
  { en: "Forsa", ar: "فرصة" },
  { en: "Aman", ar: "أمان" },
  { en: "Contact", ar: "كونتكت" },
  { en: "Lucky", ar: "لاكي" },
  { en: "Fawry", ar: "فوري" },
  { en: "Klivvr", ar: "كليڤر" },
  { en: "Mogo", ar: "موجو" },
];

export function InstallmentsGuide({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <article className="shell section stack">
      <h1>
        {ar
          ? "دليل شراء قطع غيار السيارات بالتقسيط في مصر"
          : "Buying car spare parts in installments in Egypt"}
      </h1>
      <p className="lead">
        {ar
          ? "قبل شراء قطع غيار أوبل أو MG أو شيفروليه أو بيجو أو سيتروين بالتقسيط، راجع توافق القطعة وسعرها بالجنيه المصري وإجمالي تكلفة التمويل."
          : "Before financing Opel, MG, Chevrolet, Peugeot or Citroën spare parts, check compatibility, the EGP price and the total financing cost."}
      </p>
      <section className="panel stack">
        <h2>
          {ar
            ? "هل التقسيط والكروت متاحين في المتجر؟"
            : "Are installments and cards available at this store?"}
        </h2>
        <p>
          {ar
            ? "الدفع بالكروت والتقسيط غير متاحين حاليًا في المتجر. طرق الدفع المتاحة فعليًا تظهر عند إتمام الطلب. هذا الدليل للمعلومات، ولا يعني وجود شراكة أو قبول دفع مع أي شركة مذكورة."
            : "Card payments and installments are not currently available at this store. Actual available payment methods appear at checkout. This guide is informational and does not indicate a partnership or payment acceptance with any company mentioned."}
        </p>
      </section>
      <section className="stack">
        <h2>
          {ar
            ? "إيه الفرق بين تقسيط الكريدت كارد وشركات التقسيط؟"
            : "How do credit-card installments differ from finance-company plans?"}
        </h2>
        <p>
          {ar
            ? "تقسيط بطاقة الائتمان يعتمد على البنك المُصدر والبطاقة والعملية المؤهلة. الدفع بكارت لا يحوّل العملية تلقائيًا لأقساط. شركات التمويل لها شروط موافقة وحد ائتماني وخطط ومتاجر مؤهلة؛ راجع الشركة بخصوص العملية نفسها قبل التأكيد."
            : "Credit-card installments depend on your issuing bank, card and eligible transaction. Paying by card does not automatically create installments. Finance companies have their own approval, credit-limit, plan and merchant requirements; confirm eligibility for the specific purchase before committing."}
        </p>
        <h3>
          {ar
            ? "شركات يسأل عنها المشترون في مصر"
            : "Companies shoppers ask about in Egypt"}
        </h3>
        <ul>
          {installmentProviders.map((p) => (
            <li key={p.en}>{ar ? `${p.ar} — ${p.en}` : p.en}</li>
          ))}
        </ul>
        <p>
          {ar
            ? "وجود وسيلة لسداد قسط عبر فوري أو أمان لا يعني أن شراء القطعة مؤهل للتمويل أو أن المتجر يقبل تقسيط الشركة. راجع نوع الخدمة وشروطها مباشرة مع مقدمها."
            : "Being able to repay an installment through Fawry or Aman does not establish that a spare-parts purchase is eligible for financing or that this store accepts the provider. Confirm the specific service and terms directly with the provider."}
        </p>
      </section>
      <section className="panel stack">
        <h2>
          {ar
            ? "إيه اللي أراجعه قبل التقسيط؟"
            : "What should I check before financing a purchase?"}
        </h2>
        <ul>
          <li>
            {ar
              ? "رقم القطعة، سنة السيارة، المحرك والتوافق."
              : "Part number, vehicle year, engine and compatibility."}
          </li>
          <li>
            {ar
              ? "سعر الكاش وسعر التمويل والمقدم وعدد الأقساط وقيمة كل قسط."
              : "Cash and financed prices, down payment, number of installments and each installment amount."}
          </li>
          <li>
            {ar
              ? "إجمالي المبلغ المطلوب والمصاريف والفوائد وأي رسوم تأخير أو سداد مبكر."
              : "Total payable, fees, interest and any late-payment or early-settlement charges."}
          </li>
          <li>
            {ar
              ? "الحد الأدنى للشراء، الأهلية، مدة العرض، وسياسة الإلغاء والاسترداد مع جهة التمويل."
              : "Minimum purchase, eligibility, offer expiry and the finance provider's cancellation and refund process."}
          </li>
        </ul>
        <p>
          {ar
            ? "ماينفعش نحسب القسط بقسمة سعر القطعة على عدد الشهور إلا لو عرض التمويل المؤكد ينص على كده وموضح كل التكاليف."
            : "Dividing the item price by the number of months is only accurate when a confirmed financing offer explicitly supports that calculation and discloses all costs."}
        </p>
      </section>
      <Link className="button secondary" href={`/${locale}/catalog`}>
        {ar ? "تصفح قطع الغيار والأسعار" : "Browse parts and prices"}
      </Link>
    </article>
  );
}
