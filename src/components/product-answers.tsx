import Link from "next/link";
import { productAnswers } from "@/lib/product-seo";
import type { Locale, Product } from "@/lib/catalog";

export function ProductAnswers({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  return (
    <section className="panel stack" aria-labelledby="product-questions">
      <h2 id="product-questions">
        {locale === "ar"
          ? "أسئلة عن القطعة قبل الشراء"
          : "Questions about this part before buying"}
      </h2>
      <dl className="stack">
        {productAnswers(product, locale).map(({ question, answer }) => (
          <div key={question}>
            <dt>
              <h3>{question}</h3>
            </dt>
            <dd>{answer}</dd>
          </div>
        ))}
      </dl>
      <Link className="text-link" href={`/${locale}/installments`}>
        {locale === "ar"
          ? "دليل الكروت والتقسيط في مصر"
          : "Credit cards and installments in Egypt"}{" "}
        ↗
      </Link>
      <Link className="text-link" href={`/${locale}/request-part`}>
        {locale === "ar"
          ? "اطلب مساعدة في تحديد القطعة"
          : "Request help identifying your part"}{" "}
        ↗
      </Link>
    </section>
  );
}
