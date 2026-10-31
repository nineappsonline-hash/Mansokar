import type { Locale } from "./catalog";

export type PolicySlug = "shipping" | "returns" | "warranty";

type PolicyPage = {
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  body: Record<Locale, string>;
};

/**
 * Standard store policies, published until the merchant overrides them in
 * Admin → CMS. Wording follows the store's existing policy terms, branded
 * for MOPC.
 */
export const policyContent: Record<PolicySlug, PolicyPage> = {
  shipping: {
    title: {
      ar: "سياسة الشحن والتوصيل",
      en: "Shipping and delivery policy",
    },
    description: {
      ar: "مواعيد التوصيل داخل مصر، وتكلفة الشحن حسب المحافظة، وفحص الشحنة عند الاستلام.",
      en: "Delivery times across Egypt, shipping fees by governorate and how to inspect an order on arrival.",
    },
    body: {
      ar: `نعمل في موبِك مع أفضل شركات الشحن في مصر لضمان وصول طلباتك في أسرع وقت وبأفضل حالة.

1. الجدول الزمني للتوصيل
يتم توصيل الطلبات إلى أي مكان داخل جمهورية مصر العربية خلال مدة تتراوح من 2 إلى 5 أيام عمل من تاريخ تأكيد الطلب.

ملاحظة: أيام الجمعة والعطلات الرسمية لا تعد أيام عمل لشركات الشحن.

2. تكلفة الشحن
يتم احتساب قيمة الشحن آلياً بناءً على المحافظة المختارة، وتظهر بوضوح في صفحة الدفع قبل تأكيد الطلب.

3. فحص الشحنة عند الاستلام
مسؤولية العميل: يلتزم العميل بفحص العبوات جيداً من الخارج فور استلامها من المندوب. في حال وجود أي تسريب للزيت أو كسر في العبوات، يجب على العميل رفض استلام الطلب وإبلاغنا فوراً لإرسال شحنة بديلة.

مجرد توقيعك بالاستلام من مندوب الشحن يعد إقراراً منك بأن الشحنة سليمة تماماً من الخارج وقت الاستلام.

4. عدم التواجد للاستلام
في حال عدم التواجد في العنوان المحدد، ستقوم شركة الشحن بمحاولة الاتصال بالعميل مرتين. في حال الفشل، يتم إلغاء الطلب وقد يتم حظر حساب العميل من ميزة «الدفع عند الاستلام» في المستقبل.`,
      en: `At MOPC we work with Egypt's leading courier companies to get your order to you as quickly as possible and in the best condition.

1. Delivery timeline
Orders are delivered anywhere in the Arab Republic of Egypt within 2 to 5 business days of order confirmation.

Note: Fridays and public holidays are not counted as business days by the courier companies.

2. Shipping cost
The shipping fee is calculated automatically based on the governorate you select and is shown clearly at checkout before the order is confirmed.

3. Inspecting the shipment on delivery
Customer responsibility: the customer must carefully inspect the outer packaging as soon as it is received from the courier. If there is any oil leakage or a broken container, the customer must refuse the delivery and contact us immediately so we can send a replacement shipment.

Signing on delivery is an acknowledgement that the shipment was in sound condition externally at the time of receipt.

4. Not being available for delivery
If the customer is not available at the specified address, the courier will attempt to call twice. If contact cannot be made, the order is cancelled and the customer's account may be blocked from using cash on delivery in the future.`,
    },
  },
  returns: {
    title: {
      ar: "سياسة الاستبدال والاسترجاع",
      en: "Returns and exchange policy",
    },
    description: {
      ar: "شروط استبدال أو استرجاع قطع الغيار والزيوت، والعيوب المصنعية، وطريقة رد الأموال.",
      en: "Conditions for exchanging or returning parts and oils, manufacturing defects and how refunds are paid.",
    },
    body: {
      ar: `نحن في موبِك نلتزم بأعلى معايير الجودة وبتطبيق قانون حماية المستهلك المصري (رقم 181 لسنة 2018). يرجى قراءة الشروط التالية بعناية:

1. حق العميل في الاسترجاع
يحق للعميل استبدال أو استرجاع المنتج خلال 14 يوماً من تاريخ الاستلام، شرط أن يكون المنتج في حالته الأصلية التي تم استلامه بها، وبدون فتح العبوة أو استخدامها.

2. شروط استثنائية (هام جداً)
زيوت المحركات وسوائل السيارة: لا يمكن استرجاع أو استبدال عبوات الزيت نهائياً في حال فتح «برشام» الأمان (Seal) الموجود تحت غطاء العبوة، وذلك لضمان عدم تعرض الزيت للتلوث أو التغيير لعملاء آخرين.
الفلاتر: يجب أن يكون الفلتر في كرتونته الأصلية، غير ممزقة، ولم يسبق محاولة تركيبه في السيارة (وجود آثار زيت أو ربط على الفلتر يلغي حق الاسترجاع).

3. استبدال الطلبات الخاطئة أو غير المتوافقة
في حالة طلب استبدال منتج تم طلبه بالخطأ أو غير متوافق مع سيارتك، يجب على العميل أولاً إعادة المنتج إلينا حتى نتمكن من فحصه والتأكد من أنه في حالته الأصلية، ومغلق/مختوم (برشام الأمان Seal سليم)، وبكامل مكوناته وملحقاته وتغليفه الأصلي. وبعد استلامنا للمنتج والتأكد من مطابقته لهذه الشروط، نقوم بإرسال المنتج البديل أو رد قيمة الطلب حسب رغبة العميل.

4. العيوب المصنعية
في حالة وجود عيب صناعة واضح في المنتج، يحق للعميل الاستبدال أو الاسترجاع خلال 30 يوماً من تاريخ الشراء، وتتحمل موبِك كافة تكاليف الشحن في هذه الحالة.

5. طريقة رد الأموال
الدفع أونلاين: يتم رد المبلغ لنفس البطاقة الائتمانية المستخدمة خلال 7 إلى 14 يوم عمل (يختلف حسب سياسة البنك المصدر للبطاقة).
الدفع كاش/محافظ: يتم رد المبلغ عبر تحويل بنكي أو تحويل محفظة إلكترونية لضمان حقوق العميل.`,
      en: `At MOPC we are committed to the highest quality standards and to the Egyptian Consumer Protection Law (No. 181 of 2018). Please read the following conditions carefully:

1. The customer's right to return
The customer may exchange or return the product within 14 days of receipt, provided the product is in the same original condition in which it was received, without opening the packaging or using it.

2. Special conditions (important)
Engine oils and vehicle fluids: oil containers cannot be returned or exchanged once the security seal under the cap has been opened, to ensure the oil is not contaminated or altered for other customers.
Filters: the filter must be in its original, untorn carton and must not have been fitted to the vehicle (any traces of oil or tightening on the filter cancel the right of return).

3. Exchanging wrong or incompatible orders
If a product was ordered by mistake or is incompatible with your car, the customer must first return it to us so we can inspect it and confirm that it is in its original condition, closed and sealed (security seal intact), with all components, accessories and original packaging. Once we receive it and confirm these conditions, we send the replacement product or refund the order value, as the customer prefers.

4. Manufacturing defects
If there is a clear manufacturing defect in the product, the customer may exchange or return it within 30 days of the purchase date, and MOPC bears all shipping costs in this case.

5. Refund method
Online payment: the amount is refunded to the same credit card used within 7 to 14 business days (this varies with the issuing bank's policy).
Cash/wallet payment: the amount is refunded by bank transfer or e-wallet transfer to protect the customer's rights.`,
    },
  },
  warranty: {
    title: {
      ar: "سياسة الضمان",
      en: "Warranty policy",
    },
    description: {
      ar: "ضمان قطع الغيار من الوكيل أو المورد، وما يغطيه الضمان، وطريقة رفع طلب ضمان.",
      en: "Supplier and agent warranties for spare parts, what they cover and how to submit a claim.",
    },
    body: {
      ar: `جميع قطع الغيار التي نوفرها في موبِك أصلية وتأتي بضمان من الوكيل أو المورد حسب المنتج والموديل. مدة الضمان ونطاقه موضحان في صفحة المنتج أو مستند الضمان المرفق، ويُرجى مراجعتهما قبل الشراء.

ماذا يغطي الضمان
يغطي الضمان عيوب الصناعة في القطعة نفسها وفق شروط الوكيل أو المورد، بدءاً من تاريخ الشراء الموثق بالفاتورة.

الحالات غير المشمولة
لا يغطي الضمان التلف الناتج عن التركيب غير الصحيح أو سوء الاستخدام أو التعديل أو الحوادث أو الاستهلاك الطبيعي، أو تركيب القطعة على سيارة لا تتوافق مع مواصفاتها.

كيف ترفع طلب ضمان
تواصل معنا عبر نموذج التواصل مع رقم الموبايل ورقم الطلب أو الفاتورة ورقم القطعة ووصف العيب وتاريخ ظهوره. سنراجع الطلب مع الوكيل أو المورد ونوضح لك خطوات الفحص والاستبدال.

العيوب المصنعية خلال 30 يوماً
طبقاً لسياسة الاستبدال والاسترجاع، يحق للعميل الاستبدال أو الاسترجاع خلال 30 يوماً من تاريخ الشراء في حال وجود عيب صناعة واضح، وتتحمل موبِك تكاليف الشحن في هذه الحالة.`,
      en: `All spare parts supplied by MOPC are genuine and come with a warranty from the agent or supplier according to the product and model. The warranty period and coverage are stated on the product page or in the accompanying warranty document; please review them before purchase.

What the warranty covers
The warranty covers manufacturing defects in the part itself under the agent's or supplier's terms, starting from the purchase date evidenced by the invoice.

What is not covered
The warranty does not cover damage caused by incorrect installation, misuse, modification, accidents or normal wear, or fitting the part to a vehicle that does not match its specifications.

How to submit a warranty claim
Contact us through the contact form with your mobile number, the order or invoice number, the part number, a description of the fault and when it appeared. We will review the claim with the agent or supplier and explain the inspection and replacement steps.

Manufacturing defects within 30 days
Under the returns and exchange policy, the customer may exchange or return the product within 30 days of the purchase date where there is a clear manufacturing defect, and MOPC bears the shipping costs in this case.`,
    },
  },
};

export function builtInPolicy(slug: string | undefined) {
  if (slug === "shipping" || slug === "returns" || slug === "warranty")
    return policyContent[slug];
  return undefined;
}
