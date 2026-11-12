import type { Text } from "./catalog";
const text = (ar: string, en: string): Text => ({ ar, en });
export const buyingGuides = [
  {
    slug: "genuine-parts-and-warranty",
    title: text(
      "قطع الغيار الأصلية وضمانها في مصر: إزاي تراجع بيانات القطعة؟",
      "Genuine spare parts and warranty in Egypt: what to check",
    ),
    description: text(
      "اعرف معنى «أصلي» في كتالوج موبِك، وإزاي تراجع رقم القطعة والتوافق ومدة الضمان وشروطه قبل الشراء.",
      "Understand the genuine-part label at MOPC and check the part number, vehicle fitment and product-specific warranty terms before buying.",
    ),
    sections: [
      {
        heading: text(
          "إيه معنى «أصلي» في صفحة المنتج؟",
          "What does “genuine” mean on a product page?",
        ),
        body: text(
          "موبِك بتعرض قطع غيار أصلية بضمان حسب المنتج. الماركة بتظهر GM لو كانت غير مسجلة أو مكتوب بدلها «أصلي» في بيانات الكتالوج. «أصلي» وصف للقطعة، مش بلد المنشأ. راجع رقم القطعة وماركتها وصورة العبوة الفعلية لو متاحة؛ ولو صورة المنتج مش متاحة هنوضح ده بدل ما نعرض صورة قطعة تانية.",
          "MOPC lists genuine spare parts with a product-specific warranty. The brand field defaults to GM when it was missing or previously said “أصلي” (“Genuine”) in the catalog. “Genuine” describes the part, not its country of manufacture. Check the saved part number, item brand and a real package photo where available. A labeled placeholder means no product photo is available.",
        ),
      },
      {
        heading: text(
          "هل الأصلي معناه إنه مناسب لعربيتي؟",
          "Does genuine mean the part fits my car?",
        ),
        body: text(
          "لأ. اتأكد من رقم القطعة والماركة والموديل والسنة، وبعدها راجع الموتور والجيل ومكان تركيب القطعة. السنوات المسجلة للموديل مش تأكيد لكل نسخة أو موتور. لو التوافق مش واضح، ابعتلنا رقم القطعة وبيانات العربية للمراجعة قبل الطلب.",
          "No. Match the part number, make, model and recorded years, then check engine, generation and fitting position. A saved model-year application does not confirm every trim or engine. If fitment is unclear, send the part number and vehicle details for review before ordering.",
        ),
      },
      {
        heading: text(
          "مين بيقدم الضمان ومدته كام؟",
          "Who provides the warranty, and how long is it?",
        ),
        body: text(
          "الضمان من الوكيل أو المورد حسب القطعة. مدة الضمان ونطاقه بيتحددوا في صفحة المنتج أو مستند الضمان المرفق؛ مفيش مدة واحدة تنطبق على كل القطع. راجع الشروط واحتفظ بالفاتورة لأنها بتثبت تاريخ الشراء.",
          "The agent or supplier provides the warranty according to the product. Its period and coverage are stated on the product page or accompanying warranty document; one period does not apply to every item. Read the terms and keep your invoice as proof of purchase date.",
        ),
      },
      {
        heading: text(
          "إيه اللي بيغطيه الضمان وإزاي أطلب مراجعة؟",
          "What is covered, and how do I request a review?",
        ),
        body: text(
          "الضمان بيغطي عيوب الصناعة حسب شروط الوكيل أو المورد. الضرر الناتج عن تركيب غلط أو سوء استخدام أو تعديل أو استهلاك طبيعي أو تركيب القطعة على عربية غير مناسبة مش مشمول. لو ظهرت مشكلة، تواصل معانا برقم الطلب أو الفاتورة ورقم القطعة ووصف العيب؛ ونوضحلك خطوات الفحص. تفاصيل الاسترجاع والعيوب المصنعية موجودة في سياسات المتجر.",
          "The warranty covers manufacturing defects under the agent's or supplier's terms. Damage from incorrect installation, misuse, modification, normal wear or fitting an incompatible vehicle is excluded. For a problem, contact us with the order or invoice number, part number and fault description so we can explain the review process. See the store policies for returns and manufacturing defects.",
        ),
      },
    ],
  },
  {
    slug: "check-part-compatibility",
    title: text(
      "إزاي تتأكد إن قطعة الغيار تناسب عربيتك؟",
      "How to check whether a spare part fits your car",
    ),
    description: text(
      "خطوات مطابقة رقم القطعة وسنة الصنع والجيل والموتور قبل شراء قطع الغيار في مصر.",
      "Match part number, vehicle year, generation and engine before buying spare parts in Egypt.",
    ),
    sections: [
      {
        heading: text("هل اسم الموديل كفاية؟", "Is the model name enough?"),
        body: text(
          "لأ، اسم الموديل لوحده مش كفاية. نفس الموديل ممكن يكون ليه أكتر من جيل أو موتور. اختار الماركة والموديل وسنة الصنع والجيل والموتور، وحدد مكان القطعة: قدام ولا ورا، يمين ولا شمال. فريقنا يقدر يساعدك تطابق رقم القطعة مع مواصفات عربيتك.",
          "No. A model name can cover different generations, engines and equipment. Start with make, model, year, generation and engine, then identify fitting position: front or rear, left or right. Confirming compatibility needs an explicit match to the correct configuration or a reliable parts-source review.",
        ),
      },
      {
        heading: text(
          "جهّز البيانات قبل الطلب",
          "Prepare the details before ordering",
        ),
        body: text(
          "جهّز بيانات عربيتك زي ما هي مكتوبة في أوراقها، ورقم القطعة القديمة وصورة واضحة للملصق والوصلات لو متاحة. الصورة بتساعدنا نحدد القطعة، لكن مش كفاية لوحدها لتأكيد التوافق. لو احتجنا رقم الشاسيه، ابعته لفريقنا بشكل خاص وما تكتبوش في تعليق عام.",
          "Record the vehicle details from its documents. Prepare the old part number and a clear photo of the label and connectors where possible. A photo helps identify a part but does not prove compatibility on its own. If a VIN is needed for a review, share it privately with the store team rather than in a public comment.",
        ),
      },
      {
        heading: text("راجع صفحة المنتج", "Review the product page"),
        body: text(
          "طابق رقم القطعة وماركتها ومواصفاتها ومكان تركيبها. اختار سنة الصنع والموتور وشوف نتيجة التوافق. لو مواصفات عربيتك مش موجودة أو النتيجة مش مؤكدة، اسألنا قبل الشراء. تشابه شكل القطعة أو إن العربيتين من نفس المجموعة مش كفاية.",
          "Compare the part number, item brand, specifications and fitting position. Select vehicle year and engine in the store and read the compatibility message. If the configuration is missing or compatibility is unconfirmed, request help before buying rather than choosing the nearest model name. Similar appearance or shared corporate ownership is insufficient.",
        ),
      },
      {
        heading: text(
          "إيه اللي أراجعه عند الاستلام؟",
          "What should I check on receipt?",
        ),
        body: text(
          "قبل التركيب، اتأكد إن رقم القطعة والعدد والحالة مطابقين لطلبك. احتفظ بالفاتورة والتغليف. لو في أي اختلاف، تواصل معانا قبل تعديل القطعة أو تركيبها، وخلي فني متخصص يركبها.",
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
      "افهم الفرق بين ماركة العربية وماركة القطعة وبلد التصنيع، وإيه البيانات اللي تراجعها قبل الشراء.",
      "Understand vehicle make, item brand and manufacturing country, and which details to check before buying.",
    ),
    sections: [
      {
        heading: text(
          "هل ماركة العربية هي ماركة القطعة؟",
          "Is the vehicle make the item brand?",
        ),
        body: text(
          "مش شرط. ماركة العربية بتوضح العربية اللي القطعة مناسبة ليها، وماركة القطعة هي الشركة اللي بتقدم المنتج نفسه. هتلاقي اسم الماركة ورقم القطعة ونوعها في صفحة المنتج. اسم العربية في العنوان مش معناه إن القطعة من توكيلها.",
          "Not necessarily. The vehicle make identifies the intended car, while the item brand identifies the product being sold. Check the part maker, number and type on the product page. A vehicle name in the product title does not establish that it is a genuine dealer-supplied part.",
        ),
      },
      {
        heading: text(
          "بلد الماركة ولا بلد التصنيع؟",
          "Brand nationality or manufacturing country?",
        ),
        body: text(
          "بلد المنشأ هو البلد اللي القطعة اتصنعت فيه حسب بياناتها، ومش شرط يكون نفس بلد الماركة أو العربية. اتأكد من الملصق على العبوة والقطعة وبيانات المورد. لو بلد المنشأ مش موضح، اسألنا بدل ما تفترضه من اسم الشركة.",
          "The item's country of origin describes where the actual product was manufactured according to documented information, rather than the brand's home country or the car's origin. Check the packaging label, item and supplier information. If origin is unspecified, ask for confirmation rather than infer it from a company name.",
        ),
      },
      {
        heading: text(
          "إزاي أقارن الأصلي والـ After Market؟",
          "How should I compare Original and After Market parts?",
        ),
        body: text(
          "قارن رقم القطعة ومواصفاتها ومصدرها والعربيات المناسبة ليها وشروط الضمان. لو محتاج تعرف الفرق بين OEM وقطع الشركات البديلة، اسألنا ونوضحلك. بلد الصنع لوحده مش كفاية للحكم على الجودة أو التوافق.",
          "Compare the product description, source, part number, specifications, compatibility and written warranty. An OEM or genuine label alone is insufficient to establish provenance or quality. Ask for clear evidence; manufacturing country alone does not guarantee quality or fitment.",
        ),
      },
      {
        heading: text("قائمة سريعة قبل الشراء", "A quick buying checklist"),
        body: text(
          "اتأكد من ماركة القطعة ورقمها وبلد المنشأ لو موضح، وحالة المنتج ومحتويات العبوة وسعره بالجنيه المصري. وبعدها شوف توافق القطعة وتكلفة التوصيل وشروط الاسترجاع والضمان.",
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
          "ابدأ برقم القطعة والماركة والمواصفات ومكان التركيب. شوف السعر لقطعة واحدة ولا طقم، وإيه الموجود في العبوة وحالة المنتج. تشابه العنوان أو الصورة مش معناه إن العرضين لنفس القطعة بالضبط.",
          "Start with part number, brand, specifications and fitting position. Check whether the price covers one item or a set, package contents and condition. Similar titles or photos do not establish that two offers are equivalent.",
        ),
      },
      {
        heading: text("احسب تكلفة الطلب كاملة", "Compare the whole order cost"),
        body: text(
          "كل الأسعار في المتجر بالجنيه المصري. شوف السعر والخصم لو موجود، وضيف تكلفة التوصيل علشان تعرف الإجمالي قبل ما تأكد الطلب. قارن الضمان والاسترجاع مع السعر، مش السعر لوحده.",
          "Store prices are displayed in Egyptian pounds. Review the current price and any discount, then delivery charges for your area and the total shown before confirming. Compare warranty and returns alongside price rather than choosing solely by the smallest number.",
        ),
      },
      {
        heading: text(
          "لو هتشتري بالتقسيط",
          "If you are considering installments",
        ),
        body: text(
          "اختار من طرق الدفع المتاحة في صفحة تأكيد الطلب. لو هتقسّط، قارن المقدم وعدد الأقساط وقيمة كل قسط والمصاريف وإجمالي المبلغ. الدفع بالكارت مش معناه تلقائي إن فيه تقسيط، وقسمة السعر على عدد الشهور مش بتحسب الفوايد أو المصاريف. دليل التقسيط بيوضحلك الفرق بين الاختيارات.",
          "Check whether the payment method is actually available before relying on it. For an eligible finance offer, compare the down payment, installment count, amounts, all fees and total payable. Card payment does not automatically create installments, and dividing a price by months does not account for interest or fees. The installment guide explains these distinctions and current store availability.",
        ),
      },
      {
        heading: text("تأكد من التوافق الأول", "Confirm fitment first"),
        body: text(
          "السعر المناسب مش هيفيدك لو القطعة مش مناسبة لعربيتك. اتأكد من السنة والجيل والموتور ورقم القطعة قبل الدفع. لو البيانات ناقصة، اسألنا بدل ما تختار قطعة تانية علشان أرخص.",
          "A low price is not useful if the part does not fit. Check year, generation, engine and part number before paying. If details are missing, request a review rather than choose a replacement solely because it costs less.",
        ),
      },
    ],
  },
  {
    slug: "identify-vehicle-configuration",
    title: text(
      "إزاي تحدد جيل العربية والموتور قبل طلب قطعة غيار؟",
      "How to identify your vehicle generation and engine before ordering a part",
    ),
    description: text(
      "جهّز الماركة والموديل والسنة والجيل والموتور والفتيس لتسهيل مراجعة توافق قطع الغيار.",
      "Prepare make, model, year, generation, engine and transmission for a spare-part compatibility review.",
    ),
    sections: [
      {
        heading: text(
          "الموديل وسنة الصنع حاجتين مختلفتين",
          "Model name and model year are different",
        ),
        body: text(
          "اكتب الماركة والموديل زي ما هم في أوراق العربية، واكتب سنة الصنع لوحدها. بيجو 2008 و3008 مثلًا أسماء موديلات، مش سنين صنع. ولو الموديل C3 أو C5، وضّح هل هو Aircross ولا لأ.",
          "Record the make and model from the vehicle's records, then provide the year separately. Peugeot 2008 and 3008 are model names, not manufacturing years. For C3 or C5, specify whether the vehicle is an Aircross rather than relying on the abbreviated name.",
        ),
      },
      {
        heading: text(
          "الجيل ورمز الشاسيه",
          "Generation and chassis designation",
        ),
        body: text(
          "نفس الموديل ممكن يكون ليه أكتر من جيل. اكتب اسم الجيل أو كوده لو تعرفه، زي Astra J، وما تعتمدش على سنة الترخيص لوحدها. سنين الجيل بتساعد في تحديد العربية، لكن مش معناها إن كل قطعة تناسب كل السنوات والنسخ.",
          "One model name can span multiple generations. Include the generation or designation where known, such as Astra J, and do not infer it solely from registration year. A generation's year range helps organize records but does not establish that one part fits every year or version.",
        ),
      },
      {
        heading: text(
          "الموتور والوقود والتيربو والفتيس",
          "Engine, fuel, turbo and transmission",
        ),
        body: text(
          "اكتب سعة الموتور ونوع الوقود، وهل فيه تيربو ولا لأ، ونوع الفتيس وكود الموتور لو تعرفه. موتور 1400 سي سي يعني 1.4 لتر، لكن نفس السعة مش معناها إن المواتير متطابقة. لو مش متأكد من معلومة، سيبها واسألنا بدل ما تخمّن.",
          "Record engine capacity, fuel type, turbo status and transmission type, plus an engine code from a reliable source if available. A capacity of 1400 cc equals 1.4 litres, but capacity alone does not establish an engine match. Leave unknown information for review rather than selecting an approximate value.",
        ),
      },
      {
        heading: text(
          "الهيكل والفئة ومكان القطعة",
          "Body, trim and fitting position",
        ),
        body: text(
          "وضّح شكل العربية وفئتها أو تجهيزاتها لو ليها تأثير على القطعة، وحدد القطعة قدام ولا ورا ويمين ولا شمال. جهّز رقم القطعة القديمة لو متاح. ولو احتجنا رقم الشاسيه للتأكيد، ابعته لفريقنا بشكل خاص وما تنشروش في الأسئلة العامة.",
          "Include body style and trim or equipment when relevant to the part, and specify front or rear and left or right. Prepare the old part number where possible. If the store team needs a VIN for review, share it privately rather than in public questions.",
        ),
      },
    ],
  },
];
