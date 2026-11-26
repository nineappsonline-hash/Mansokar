import {
  merchantPriceReady,
  verifiedAvailability,
  verifiedCondition,
} from "./seo-policy";
import { countryOfOrigin } from "./product-specifications";
import { validGtin } from "./merchant-feed";
import { money, type Locale, type Product } from "./catalog";

/** Additional catalog references are not automatically verified OEM identifiers. */
export function recordedPartReferences(p: Pick<Product, "partNumber" | "partNumbers">) {
  const seen = new Set<string>();
  seen.add(p.partNumber.trim().toLocaleLowerCase());
  return (p.partNumbers ?? [])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => {
      const key = value.toLocaleLowerCase();
      if (!value || value.length > 100 || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

/** Search result headline: preserve item, maker, car model and part number.
 * For overlong automatic headlines only, move model-year ranges to the
 * description/body instead of hiding the distinguishing part number.
 * Never rewrite merchant-authored titles here.
 */
export function productSerpTitle(
  baseTitle: string,
  storeName: string,
  manual = false,
) {
  const base = baseTitle.replace(/\s+/g, " ").trim();
  const suffix = storeName.trim();
  const titled = suffix ? `${base} | ${suffix}` : base;
  if (manual || titled.length <= 60) return titled;
  const noYearRanges = base.replace(/\s+(?:19|20)\d{2}\s*[–—-]\s*(?:19|20)\d{2}(?=\s*(?:[|،;,]|$))/g, "");
  if (noYearRanges !== base) {
    const withStore = suffix ? `${noYearRanges} | ${suffix}` : noYearRanges;
    if (withStore.length <= 60) return withStore;
    if (noYearRanges.length < base.length) return noYearRanges;
  }
  // Only drop the store suffix if it would consume search-result title space;
  // product names and references remain intact.
  return base.length < titled.length ? base : titled;
}

export function productSearchCopy(p: Product, locale: Locale) {
  return {
    title:
      p.seo?.title?.[locale]?.trim() ||
      `${p.name[locale]} | ${p.manufacturer} | ${p.partNumber}`,
    description:
      p.seo?.description?.[locale]?.trim() ||
      (locale === "ar"
        ? `${p.name.ar} من ${p.manufacturer}، رقم القطعة ${p.partNumber}. السعر ${money(p.sale ?? p.price, locale)}. راجع سنة الصنع والموتور والتوافق قبل الطلب. ${p.description.ar}`
        : `${p.name.en} by ${p.manufacturer}, part ${p.partNumber}. ${money(p.sale ?? p.price, locale)}. Check vehicle year, engine and compatibility before ordering. ${p.description.en}`
      ).slice(0, 155).trimEnd(),
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
    ...(p.partNumber?.trim() ? { mpn: p.partNumber } : {}),
    ...(p.specs?.gtin && validGtin(p.specs.gtin)
      ? { [`gtin${p.specs.gtin.length}`]: p.specs.gtin }
      : {}),
    ...(/^أصلي$/u.test(p.manufacturer.trim())
      ? {}
      : {
          brand: { "@type": "Brand", name: p.manufacturer },
          manufacturer: { "@type": "Organization", name: p.manufacturer },
        }),
    ...(images.length
      ? { image: images.map((src) => new URL(src, base).href) }
      : {}),
    ...((countryOfOrigin(p.specs.country_of_origin) ||
      recordedPartReferences(p).length)
      ? {
          additionalProperty: [
            ...(countryOfOrigin(p.specs.country_of_origin)
              ? [{
                  "@type": "PropertyValue",
                  name: "Country of origin",
                  value: countryOfOrigin(p.specs.country_of_origin),
                }]
              : []),
            ...recordedPartReferences(p).map((value) => ({
              "@type": "PropertyValue",
              name: "Additional recorded part reference",
              value,
            })),
          ],
        }
      : {}),
    // A published catalog entry may be visible but not available to order.
    // Only advertise a purchasable Offer when checkout is actually enabled.
    offers: p.orderable && merchantPriceReady(p)
      ? {
          "@type": "Offer",
          url,
          priceCurrency: "EGP",
          price: ((p.sale ?? p.price) / 100).toFixed(2),
          // Orderability alone does not prove physical stock availability.
          ...(verifiedCondition(p)
            ? { itemCondition: verifiedCondition(p) }
            : {}),
          ...(verifiedAvailability(p)
            ? { availability: verifiedAvailability(p) }
            : {}),
        }
      : undefined,
  };
}

export function productAnswers(p: Product, locale: Locale) {
  const ar = locale === "ar";
  const restrictions = p.specs[`fitment_notes_${locale}`];
  const brandUnknown = p.manufacturer.trim() === "أصلي";
  const months = Number(p.specs.warranty_months);
  const recordedWarranty =
    Number.isInteger(months) && months > 0 && months <= 600
      ? ar
        ? `مدة الضمان المسجلة ${months} ${months === 1 ? "شهر" : "شهور"}. `
        : `The recorded warranty period is ${months} ${months === 1 ? "month" : "months"}. `
      : "";
  return [
    {
      question: ar ? `سعر ${p.name.ar} كام؟` : `How much is ${p.name.en}?`,
      answer: ar
        ? `السعر المعروض ${money(p.sale ?? p.price, locale)}. تكلفة التوصيل بتتحدد حسب المحافظة وبتظهر وقت تأكيد الطلب.`
        : `The displayed price is ${money(p.sale ?? p.price, locale)}. Delivery charges depend on your area and are shown when ordering.`,
    },
    {
      question: ar
        ? "هل القطعة أصلية وإيه شروط ضمانها؟"
        : "Is this a genuine part, and what warranty applies?",
      answer: ar
        ? `راجع ماركة القطعة ورقمها وصور العبوة أو مستند المورد لو متاح لتأكيد المصدر، لأن اسم الماركة أو وصف «أصلي» لوحده مش إثبات. ${recordedWarranty}راجع شروط الضمان المكتوبة للمنتج أو اسألنا عن تفاصيلها قبل الشراء واحتفظ بالفاتورة.`
        : `Check the item brand, part number and any available packaging or supplier documentation to confirm its source; a brand name or “genuine” label alone does not prove authenticity. ${recordedWarranty}Review the product-specific warranty terms or ask us to confirm them before ordering, and keep the invoice.`,
    },
    {
      question: ar
        ? "إزاي أتأكد إن القطعة تناسب عربيتي؟"
        : "How do I check whether this part fits my car?",
      answer: ar
        ? `راجع رقم القطعة ${p.partNumber}، واختار عربيتك بسنة الصنع والموتور للتحقق من التوافق. اسم الموديل لوحده مش كفاية. لو التوافق غير مؤكد، اطلب مراجعة قبل الشراء.`
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
        ? `${brandUnknown ? "مكتوب «أصلي» لما اسم الشركة المصنعة مش متسجل؛ اسألنا لو محتاج تعرف الشركة." : `ماركة القطعة: ${p.manufacturer}.`} بلد المنشأ: ${countryOfOrigin(p.specs.country_of_origin) || "مش موضح؛ اسألنا قبل الشراء"}. «أصلي» وصف للقطعة، مش اسم بلد تصنيعها.`
        : `${brandUnknown ? "The brand field shows “أصلي” (“Genuine”) because the maker’s name is not recorded; contact us if you need it confirmed." : `Item brand: ${p.manufacturer}.`} Country of origin: ${countryOfOrigin(p.specs.country_of_origin) || "not specified; request confirmation before buying"}. Genuine describes the part, not its manufacturing country.`,
    },
    {
      question: ar
        ? "هل أقدر أشتري القطعة بالتقسيط أو بالكريدت كارد؟"
        : "Can I buy this part in installments or with a credit card?",
      answer: ar
        ? "راجع طرق الدفع المعروضة وقت تأكيد الطلب. دليل التقسيط يشرح خيارات مثل Valu وSuhoola وContact وKlivvr وAman؛ ذكر الشركة لا يؤكد تفعيلها لهذا الطلب. الأهلية والتكلفة والموافقة يحددها مقدم الخدمة."
        : "Check the payment methods shown at checkout. The installments guide explains options such as Valu, Suhoola, Contact, Klivvr and Aman; naming a provider does not confirm it is enabled for this order. Eligibility, costs and approval depend on the provider.",
    },
  ];
}
