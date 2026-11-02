import type { Text } from "./catalog";
const t = (ar: string, en: string): Text => ({ ar, en });
export const storeQuestions = [
  {
    question: t(
      "إزاي ألاقي قطعة الغيار المناسبة؟",
      "How do I find the right spare part?",
    ),
    answer: t(
      "اختار ماركة العربية والموديل وسنة الصنع والمحرك، وراجع رقم القطعة ومكان تركيبها. وجود اسم موديل في العنوان وحده مش تأكيد للتوافق. لو التكوين مش موجود أو الرسالة غير مؤكدة، ابعت استفسار قبل الشراء.",
      "Choose the vehicle make, model, year and engine, then check the part number and fitting position. A model name in the title does not confirm fitment. If the configuration is missing or the result is unconfirmed, request help before buying.",
    ),
  },
  {
    question: t("الأسعار بأي عملة؟", "What currency are prices in?"),
    answer: t(
      "الأسعار المعروضة بالجنيه المصري. راجع السعر الحالي ورسوم الشحن والإجمالي عند إتمام الطلب. سعر القطعة لا يشمل تلقائيًا تركيبها إلا لو وُضح ذلك في عرض المنتج.",
      "Displayed prices are in Egyptian pounds. Review the current price, shipping charge and total at checkout. Fitting is not automatically included unless the product offer explicitly says so.",
    ),
  },
  {
    question: t(
      "إيه الفرق بين الشحن العادي والسريع؟",
      "How do normal and express delivery differ?",
    ),
    answer: t(
      "الشحن العادي خلال 2–5 أيام عمل، والشحن السريع خلال 48 ساعة من تأكيد الطلب وتوافر المنتجات. اختار الطريقة المتاحة لمحافظتك عند إتمام الطلب؛ لكل طريقة سعرها. أيام العمل العادية لا تشمل الجمعة والعطلات الرسمية.",
      "Normal delivery is within 2–5 business days; express delivery is within 48 hours of order confirmation and product availability. Choose an available method for your governorate at checkout; each has its own rate. Normal business days exclude Fridays and public holidays.",
    ),
  },
  {
    question: t(
      "هل الكروت وشركات التقسيط متاحة؟",
      "Are cards and installment companies available?",
    ),
    answer: t(
      "يمكنك الدفع بالبطاقات البنكية أو عبر التقسيط من Valu وContact وSuhoola وKlivvr وAman عند إتمام الطلب، حسب توافر الخطة. كما يمكنك الدفع عبر إنستاباي أو المحفظة الإلكترونية برفع إثبات التحويل. طرق الدفع المتاحة تظهر دائمًا في صفحة إتمام الطلب.",
      "You can pay by bank card or in installments with Valu, Contact, Suhoola, Klivvr and Aman at checkout, subject to plan availability. You can also pay via InstaPay or e-wallet by uploading a transfer receipt. Available payment methods always appear at checkout.",
    ),
  },
  {
    question: t(
      "إزاي أطلب مساعدة في شحنة أو ضمان؟",
      "How do I request help with delivery or warranty?",
    ),
    answer: t(
      "املأ نموذج التواصل برقم موبايلك واستفسارك، وأضف رقم الطلب إن وجد. اختر موضوع الشحن أو الاسترجاع أو الضمان، وسيتواصل معك فريق المتجر. لا تنشر أكواد تحقق أو بيانات كروت أو رقم شاسيه كامل.",
      "Fill in the contact form with your mobile number and inquiry, including the order number if available. Choose shipping, returns or warranty and the store team will contact you. Do not publish verification codes, card details or a full VIN.",
    ),
  },
  {
    question: t(
      "هل كل القطع لها نفس الضمان؟",
      "Do all parts have the same warranty?",
    ),
    answer: t(
      "لا نفترض مدة ضمان موحدة. راجع الشروط المثبتة للقطعة والمورد في صفحة المنتج، واطلب توضيحها قبل الشراء إذا كانت ناقصة. الضمان التجاري لا يحل محل حقوق المستهلك القانونية.",
      "There is no assumed universal warranty period. Check the documented item and supplier terms on the product page and request clarification if missing. A commercial warranty does not replace statutory consumer rights.",
    ),
  },
];
