import type { Text } from "./catalog";
const text = (ar: string, en: string): Text => ({ ar, en });
export const buyingGuides = [
  {
    slug: "check-part-compatibility",
    title: text(
      "إزاي تتأكد إن قطعة الغيار تناسب عربيتك؟",
      "How to check whether a spare part fits your car",
    ),
    description: text(
      "خطوات مطابقة رقم القطعة وسنة السيارة والجيل والمحرك قبل شراء قطع الغيار في مصر.",
      "Match part number, vehicle year, generation and engine before buying spare parts in Egypt.",
    ),
    sections: [
      {
        heading: text("هل اسم الموديل كفاية؟", "Is the model name enough?"),
        body: text(
          "لا. نفس اسم الموديل ممكن يشمل أجيال ومحركات وتجهيزات مختلفة. ابدأ بالماركة والموديل وسنة الصنع والجيل والمحرك، وحدد مكان القطعة: أمامي أو خلفي، يمين أو شمال. تأكيد التوافق يحتاج ربطًا صريحًا بالتكوين الصحيح أو مراجعة مصدر قطع موثوق.",
          "No. A model name can cover different generations, engines and equipment. Start with make, model, year, generation and engine, then identify fitting position: front or rear, left or right. Confirming compatibility needs an explicit match to the correct configuration or a reliable parts-source review.",
        ),
      },
      {
        heading: text(
          "جهّز البيانات قبل الطلب",
          "Prepare the details before ordering",
        ),
        body: text(
          "دوّن بيانات السيارة كما في مستنداتها. جهّز رقم القطعة القديمة وصورة واضحة للملصق والوصلات إن أمكن. الصورة تساعد في التعرف على القطعة لكنها لا تثبت التوافق وحدها. لو رقم الشاسيه مطلوب للمراجعة، شاركه بشكل خاص مع فريق المتجر، ولا تنشره في تعليق عام.",
          "Record the vehicle details from its documents. Prepare the old part number and a clear photo of the label and connectors where possible. A photo helps identify a part but does not prove compatibility on its own. If a VIN is needed for a review, share it privately with the store team rather than in a public comment.",
        ),
      },
      {
        heading: text("راجع صفحة المنتج", "Review the product page"),
        body: text(
          "طابق رقم القطعة وماركتها والمواصفات ومكان التركيب. اختار سنة السيارة والمحرك في المتجر وراجع رسالة التوافق. لو التكوين غير موجود أو التوافق غير مؤكد، اطلب مساعدة قبل الشراء بدل اختيار أقرب اسم موديل. تشابه الشكل أو انتماء سيارتين لنفس المجموعة لا يكفي.",
          "Compare the part number, item brand, specifications and fitting position. Select vehicle year and engine in the store and read the compatibility message. If the configuration is missing or compatibility is unconfirmed, request help before buying rather than choosing the nearest model name. Similar appearance or shared corporate ownership is insufficient.",
        ),
      },
      {
        heading: text(
          "إيه اللي أراجعه عند الاستلام؟",
          "What should I check on receipt?",
        ),
        body: text(
          "راجع رقم القطعة والملصق والعدد والحالة مقابل الطلب قبل التركيب. احتفظ بالفاتورة والتغليف وراجع سياسة الاسترجاع المنشورة. عند وجود اختلاف، تواصل مع المتجر قبل تعديل القطعة أو تركيبها، واستعن بفني مؤهل في أعمال التركيب.",
          "Check the part number, label, quantity and condition against the order before fitting. Retain the invoice and packaging and read the published return policy. If something differs, contact the store before modifying or fitting the item, and use a qualified technician for installation.",
        ),
      },
    ],
  },
  {
    slug: "item-brand-and-country-of-origin",
    title: text(
      "ماركة قطعة الغيار وبلد المنشأ: إيه الفرق؟",
      "Spare-part brand and country of origin: what is the difference?",
    ),
    description: text(
      "افهم الفرق بين ماركة السيارة وماركة القطعة وبلد التصنيع، وإيه البيانات اللي تراجعها قبل الشراء.",
      "Understand vehicle make, item brand and manufacturing country, and which details to check before buying.",
    ),
    sections: [
      {
        heading: text(
          "هل ماركة السيارة هي ماركة القطعة؟",
          "Is the vehicle make the item brand?",
        ),
        body: text(
          "مش بالضرورة. ماركة السيارة تحدد العربية المستهدفة، لكن ماركة القطعة هي الاسم التجاري للمنتج المعروض. راجع اسم مصنع القطعة ورقمها ونوعها في صفحة المنتج، ولا تعتبر وجود اسم السيارة في عنوان المنتج دليلًا إنه منتج أصلي من توكيلها.",
          "Not necessarily. The vehicle make identifies the intended car, while the item brand identifies the product being sold. Check the part maker, number and type on the product page. A vehicle name in the product title does not establish that it is a genuine dealer-supplied part.",
        ),
      },
      {
        heading: text(
          "بلد الماركة ولا بلد التصنيع؟",
          "Brand nationality or manufacturing country?",
        ),
        body: text(
          "بلد منشأ القطعة هو بلد تصنيع المنتج نفسه حسب بياناته الموثقة، وليس بلد تأسيس الماركة ولا بلد السيارة. راجع ملصق العبوة والقطعة وبيانات المورد. لو بلد المنشأ غير محدد، اطلب تأكيده بدل افتراضه من اسم الشركة.",
          "The item's country of origin describes where the actual product was manufactured according to documented information, rather than the brand's home country or the car's origin. Check the packaging label, item and supplier information. If origin is unspecified, ask for confirmation rather than infer it from a company name.",
        ),
      },
      {
        heading: text(
          "إزاي أقارن الأصلي والبديل؟",
          "How should I compare genuine and aftermarket parts?",
        ),
        body: text(
          "قارن وصف المنتج والمصدر ورقم القطعة والمواصفات والتوافق والضمان المكتوب. كلمة OEM أو أصلي وحدها لا تكفي لإثبات المصدر أو الجودة. اطلب معلومات واضحة، ولا تعتبر بلد الصنع وحده ضمانًا للجودة أو التوافق.",
          "Compare the product description, source, part number, specifications, compatibility and written warranty. An OEM or genuine label alone is insufficient to establish provenance or quality. Ask for clear evidence; manufacturing country alone does not guarantee quality or fitment.",
        ),
      },
      {
        heading: text("قائمة سريعة قبل الشراء", "A quick buying checklist"),
        body: text(
          "تأكد من ماركة القطعة ورقمها وبلد المنشأ إن كان موثقًا، وحالتها ومحتويات العبوة وسعرها بالجنيه المصري. بعد كده راجع التوافق وتكلفة الشحن وشروط الاسترجاع والضمان الخاصة بالمنتج.",
          "Confirm item brand, part number, documented origin where available, condition, package contents and EGP price. Then check compatibility, delivery cost and the product's return and warranty terms.",
        ),
      },
    ],
  },
  {
    slug: "compare-spare-part-prices",
    title: text(
      "إزاي تقارن أسعار قطع الغيار في مصر؟",
      "How to compare spare-part prices in Egypt",
    ),
    description: text(
      "قارن سعر القطعة بالجنيه المصري والكمية والتوافق والشحن وإجمالي تكلفة التقسيط قبل اتخاذ القرار.",
      "Compare EGP price, quantity, compatibility, shipping and total installment cost before deciding.",
    ),
    sections: [
      {
        heading: text(
          "هل العرضين لنفس القطعة؟",
          "Are both offers for the same item?",
        ),
        body: text(
          "ابدأ برقم القطعة والماركة والمواصفات ومكان التركيب. راجع هل السعر لقطعة واحدة ولا طقم، ومحتويات العبوة وحالة المنتج. عنوان متشابه أو صورة قريبة مش دليل إن عرضين متطابقين.",
          "Start with part number, brand, specifications and fitting position. Check whether the price covers one item or a set, package contents and condition. Similar titles or photos do not establish that two offers are equivalent.",
        ),
      },
      {
        heading: text("احسب تكلفة الطلب كاملة", "Compare the whole order cost"),
        body: text(
          "الأسعار المعروضة في المتجر بالجنيه المصري. راجع السعر الحالي والخصم إن وجد، ثم تكلفة التوصيل لمنطقتك والإجمالي الظاهر قبل تأكيد الطلب. قارن الضمان والاسترجاع مع السعر بدل اختيار أقل رقم فقط.",
          "Store prices are displayed in Egyptian pounds. Review the current price and any discount, then delivery charges for your area and the total shown before confirming. Compare warranty and returns alongside price rather than choosing solely by the smallest number.",
        ),
      },
      {
        heading: text(
          "لو هتشتري بالتقسيط",
          "If you are considering installments",
        ),
        body: text(
          "راجع توافر طريقة الدفع فعليًا قبل الاعتماد عليها. لو فيه عرض تمويل مؤهل، قارن المقدم وعدد الأقساط وقيمتها وكل المصاريف وإجمالي المبلغ المطلوب. الدفع بكارت لا يعني تلقائيًا التقسيط، وقسمة السعر على عدد الشهور لا تحسب الفوائد أو الرسوم. دليل التقسيط يوضح الفروق وتوافر الخدمة الحالي في المتجر.",
          "Check whether the payment method is actually available before relying on it. For an eligible finance offer, compare the down payment, installment count, amounts, all fees and total payable. Card payment does not automatically create installments, and dividing a price by months does not account for interest or fees. The installment guide explains these distinctions and current store availability.",
        ),
      },
      {
        heading: text("تأكد من التوافق الأول", "Confirm fitment first"),
        body: text(
          "السعر المناسب مش مفيد لو القطعة غير متوافقة. راجع السنة والجيل والمحرك ورقم القطعة قبل الدفع. لو البيانات ناقصة، اطلب مراجعة القطعة بدل اختيار منتج بديل لمجرد إن سعره أقل.",
          "A low price is not useful if the part does not fit. Check year, generation, engine and part number before paying. If details are missing, request a review rather than choose a replacement solely because it costs less.",
        ),
      },
    ],
  },
  {
    slug: "identify-vehicle-configuration",
    title: text(
      "إزاي تحدد جيل العربية والمحرك قبل طلب قطعة غيار؟",
      "How to identify your vehicle generation and engine before ordering a part",
    ),
    description: text(
      "جهّز الماركة والموديل والسنة والجيل والمحرك والفتيس لتسهيل مراجعة توافق قطع الغيار.",
      "Prepare make, model, year, generation, engine and transmission for a spare-part compatibility review.",
    ),
    sections: [
      {
        heading: text(
          "الموديل وسنة الصنع حاجتين مختلفتين",
          "Model name and model year are different",
        ),
        body: text(
          "اكتب الماركة والموديل كما في بيانات السيارة، ثم سنة الصنع بشكل منفصل. بيجو 2008 و3008 مثلًا أسماء موديلات، وليست سنوات تصنيع. ولو الاسم C3 أو C5، وضّح هل السيارة Aircross أم لا بدل الاعتماد على الاسم المختصر.",
          "Record the make and model from the vehicle's records, then provide the year separately. Peugeot 2008 and 3008 are model names, not manufacturing years. For C3 or C5, specify whether the vehicle is an Aircross rather than relying on the abbreviated name.",
        ),
      },
      {
        heading: text(
          "الجيل ورمز الشاسيه",
          "Generation and chassis designation",
        ),
        body: text(
          "نفس اسم الموديل قد يمتد لأجيال مختلفة. اذكر اسم الجيل أو كوده إن كان معروفًا، مثل Astra J، ولا تخمّن الجيل من سنة الترخيص وحدها. مدى سنوات الجيل يساعد في التنظيم لكنه لا يؤكد أن قطعة واحدة تناسب كل السنوات أو النسخ.",
          "One model name can span multiple generations. Include the generation or designation where known, such as Astra J, and do not infer it solely from registration year. A generation's year range helps organize records but does not establish that one part fits every year or version.",
        ),
      },
      {
        heading: text(
          "المحرك والوقود والتيربو والفتيس",
          "Engine, fuel, turbo and transmission",
        ),
        body: text(
          "دوّن سعة المحرك ونوع الوقود ووجود تيربو من عدمه ونوع ناقل الحركة، وكود المحرك لو متاح من مصدر موثوق. سعة 1400 سي سي تعادل 1.4 لتر، لكن السعة وحدها لا تثبت تطابق المحرك. اترك أي معلومة غير معروفة للمراجعة بدل اختيار قيمة تقريبية.",
          "Record engine capacity, fuel type, turbo status and transmission type, plus an engine code from a reliable source if available. A capacity of 1400 cc equals 1.4 litres, but capacity alone does not establish an engine match. Leave unknown information for review rather than selecting an approximate value.",
        ),
      },
      {
        heading: text(
          "الهيكل والفئة ومكان القطعة",
          "Body, trim and fitting position",
        ),
        body: text(
          "اذكر نوع الهيكل والفئة أو التجهيز عندما يؤثر على القطعة، وحدد هل القطعة أمامية أم خلفية ويمين أم شمال. جهّز رقم القطعة القديمة إن أمكن. لو فريق المتجر يحتاج رقم الشاسيه للمراجعة، شاركه بشكل خاص، ولا تنشره في الأسئلة العامة.",
          "Include body style and trim or equipment when relevant to the part, and specify front or rear and left or right. Prepare the old part number where possible. If the store team needs a VIN for review, share it privately rather than in public questions.",
        ),
      },
    ],
  },
];
