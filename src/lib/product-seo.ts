import { countryOfOrigin } from "./product-specifications";
import { money, type Locale, type Product } from "./catalog";

export function productSearchCopy(p: Product, locale: Locale) {
  return {
    title:
      p.seo?.title?.[locale]?.trim() ||
      `${p.name[locale]} | ${p.manufacturer} | ${p.partNumber}`,
    description:
      p.seo?.description?.[locale]?.trim() ||
      (locale === "ar"
        ? `${p.name.ar} من ${p.manufacturer}، رقم القطعة ${p.partNumber}. السعر ${money(p.sale ?? p.price, locale)}. راجع سنة السيارة والمحرك والتوافق قبل الطلب. ${p.description.ar}`
        : `${p.name.en} by ${p.manufacturer}, part ${p.partNumber}. ${money(p.sale ?? p.price, locale)}. Check vehicle year, engine and compatibility before ordering. ${p.description.en}`
      ).slice(0, 300),
  };
}

export function productStructuredData(
  p: Product,
  locale: Locale,
  base: string,
  images: string[],
) {
  if (p.demo || p.status !== "published") return null;
  const url = new URL(`/${locale}/products/${p.slug}`, base).href;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    url,
    name: p.name[locale],
    description: p.description[locale],
    sku: p.sku,
    mpn: p.partNumber,
    brand: { "@type": "Brand", name: p.manufacturer },
    manufacturer: { "@type": "Organization", name: p.manufacturer },
    ...(images.length
      ? { image: images.map((src) => new URL(src, base).href) }
      : {}),
    ...(countryOfOrigin(p.specs.country_of_origin)
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "Country of origin",
              value: countryOfOrigin(p.specs.country_of_origin),
            },
          ],
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "EGP",
      price: ((p.sale ?? p.price) / 100).toFixed(2),
      // Orderability alone does not prove physical stock availability.
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function productAnswers(p: Product, locale: Locale) {
  const ar = locale === "ar";
  const restrictions = p.specs[`fitment_notes_${locale}`];
  return [
    {
      question: ar ? `سعر ${p.name.ar} كام؟` : `How much is ${p.name.en}?`,
      answer: ar
        ? `السعر المعروض ${money(p.sale ?? p.price, locale)}. رسوم التوصيل تتحدد حسب المنطقة وتظهر عند الطلب.`
        : `The displayed price is ${money(p.sale ?? p.price, locale)}. Delivery charges depend on your area and are shown when ordering.`,
    },
    {
      question: ar
        ? "إزاي أتأكد إن القطعة تناسب عربيتي؟"
        : "How do I check whether this part fits my car?",
      answer: ar
        ? `راجع رقم القطعة ${p.partNumber}، واختار سيارتك بسنة الصنع والمحرك للتحقق من التوافق. اسم الموديل لوحده مش كفاية. لو التوافق غير مؤكد، اطلب مراجعة قبل الشراء.`
        : `Check part number ${p.partNumber} and select your car's year and engine to check compatibility. The model name alone is insufficient. Request a review before buying if compatibility is unconfirmed.`,
    },
    ...(restrictions
      ? [
          {
            question: ar
              ? "هل في قيود أو استثناءات للتوافق؟"
              : "Are there compatibility restrictions or exclusions?",
            answer: restrictions,
          },
        ]
      : []),
    {
      question: ar
        ? "ماركة القطعة وبلد المنشأ إيه؟"
        : "What are the item brand and country of origin?",
      answer: ar
        ? `ماركة القطعة: ${p.manufacturer}. بلد المنشأ: ${countryOfOrigin(p.specs.country_of_origin) || "غير محدد؛ اطلب تأكيده قبل الشراء"}. بلد الماركة لا يحدد بلد تصنيع القطعة.`
        : `Item brand: ${p.manufacturer}. Country of origin: ${countryOfOrigin(p.specs.country_of_origin) || "not specified; request confirmation before buying"}. Brand nationality does not determine where the item was manufactured.`,
    },
    {
      question: ar
        ? "هل أقدر أشتري القطعة بالتقسيط أو بالكريدت كارد؟"
        : "Can I buy this part in installments or with a credit card?",
      answer: ar
        ? "في المتجر طرق دفع متعددة: الدفع عند الاستلام، وInstapay، والمحفظة الإلكترونية، وبطاقات الائتمان والخصم. كمان فيه تقسيط عبر Valu وSuhoola وContact وKlivvr وAman."
        : "In the store you can pay by cash on delivery, Instapay, e-wallet, credit and debit cards. There are also installments through Valu, Suhoola, Contact, Klivvr and Aman.",
    },
  ];
}
