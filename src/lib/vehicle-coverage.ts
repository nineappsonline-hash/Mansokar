import type { Text } from "./catalog";

type TargetModel = { slug: string; name: Text; note: Text };
type TargetBrand = {
  slug: string;
  name: string;
  ar: string;
  models: TargetModel[];
};
const note = (ar: string, en: string) => ({ ar, en });
export const targetBrands: TargetBrand[] = [
  {
    slug: "opel",
    name: "Opel",
    ar: "أوبل",
    models: [
      {
        slug: "insignia",
        name: note("انسيجنيا", "Insignia"),
        note: note(
          "حدّد الجيل والمحرك ومكان تركيب القطعة؛ اسم انسيجنيا وحده لا يحدد رقم القطعة.",
          "Identify the generation, engine and fitting position; the Insignia name alone does not identify a part number.",
        ),
      },
      {
        slug: "astra",
        name: note("استرا", "Astra"),
        note: note(
          "اذكر جيل أسترا ونوع الهيكل مع السنة والمحرك، ولا تعتبر قطع الأجيال المختلفة متبادلة تلقائيًا.",
          "Include the Astra generation and body style alongside year and engine; do not assume parts interchange between generations.",
        ),
      },
      {
        slug: "grandland",
        name: note("جراند لاند", "Grandland"),
        note: note(
          "اكتب الاسم الكامل لجراند لاند أو جراند لاند X كما في بيانات السيارة، وراجع المحرك ورقم القطعة.",
          "Use the full Grandland or Grandland X designation from the vehicle records and check engine and part number.",
        ),
      },
      {
        slug: "crossland",
        name: note("كروس لاند", "Crossland"),
        note: note(
          "وضّح اسم كروس لاند أو كروس لاند X وسنة الصنع والمحرك قبل مطابقة قطع الصيانة.",
          "Specify Crossland or Crossland X, model year and engine before matching service parts.",
        ),
      },
    ],
  },
  {
    slug: "mg",
    name: "MG",
    ar: "إم جي",
    models: [
      {
        slug: "5",
        name: note("5", "5"),
        note: note(
          "MG 5 وMG 6 موديلان مختلفان؛ راجع رقم القطعة بدل افتراض توافق القطع بينهما.",
          "MG 5 and MG 6 are distinct models; check the part number rather than assuming interchangeability.",
        ),
      },
      {
        slug: "6",
        name: note("6", "6"),
        note: note(
          "حدّد نسخة MG 6 وسنة الصنع والمحرك؛ التشابه مع أسماء قطع MG 5 لا يؤكد التوافق.",
          "Identify the MG 6 version, year and engine; a similar MG 5 part name does not confirm compatibility.",
        ),
      },
      {
        slug: "hs",
        name: note("HS", "HS"),
        note: note(
          "دوّن جيل MG HS وبيانات المحرك ونسخة السيارة كما في مستنداتها، خاصة قبل طلب قطعة ميكانيكية أو كهربائية.",
          "Record the MG HS generation, engine and version from its documents, especially for mechanical or electrical parts.",
        ),
      },
      {
        slug: "rx5",
        name: note("RX5", "RX5"),
        note: note(
          "ميّز جيل RX5 ونسخة المحرك، وراجع الوصلات ومكان التركيب ورقم القطعة عند المطابقة.",
          "Distinguish the RX5 generation and engine version, and compare connectors, fitting position and part number.",
        ),
      },
      {
        slug: "zs",
        name: note("ZS", "ZS"),
        note: note(
          "اكتب نسخة MG ZS والمحرك بالكامل؛ الاسم التجاري أو شكل القطعة وحده لا يثبت التوافق.",
          "Provide the full MG ZS version and engine; the model name or a part's appearance alone does not prove compatibility.",
        ),
      },
    ],
  },
  {
    slug: "chevrolet",
    name: "Chevrolet",
    ar: "شيفروليه",
    models: [
      {
        slug: "cruze",
        name: note("كروز", "Cruze"),
        note: note(
          "حدّد سنة كروز والمحرك وناقل الحركة عند طلب القطع المرتبطة به؛ رقم القطعة أهم من التشابه في الشكل.",
          "Specify Cruze year, engine and transmission where relevant; part numbers matter more than visual similarity.",
        ),
      },
      {
        slug: "malibu",
        name: note("ماليبو", "Malibu"),
        note: note(
          "راجع جيل ماليبو والمحرك ومكان تركيب القطعة؛ لا تفترض أن قطع كروز تناسبها لمجرد اشتراك الماركة.",
          "Check Malibu generation, engine and fitting position; sharing the Chevrolet brand does not establish Cruze compatibility.",
        ),
      },
      {
        slug: "captiva",
        name: note("كابتيفا", "Captiva"),
        note: note(
          "اسم كابتيفا قد يشير لتكوينات وأجيال مختلفة؛ طابق سنة الصنع والمحرك ورقم القطعة قبل الطلب.",
          "Captiva can refer to different configurations and generations; match year, engine and part number before ordering.",
        ),
      },
    ],
  },
  {
    slug: "peugeot",
    name: "Peugeot",
    ar: "بيجو",
    models: [
      {
        slug: "2008",
        name: note("2008", "2008"),
        note: note(
          "2008 هو اسم الموديل وليس سنة الصنع. اذكر سنة تصنيع سيارتك والجيل والمحرك بشكل منفصل.",
          "2008 is the model name, not the build year. Provide the vehicle's actual year, generation and engine separately.",
        ),
      },
      {
        slug: "3008",
        name: note("3008", "3008"),
        note: note(
          "حدّد جيل 3008 وسنة الصنع والمحرك؛ مشاركة الاسم أو بعض المكونات مع موديل آخر لا تكفي للمطابقة.",
          "Identify the 3008 generation, year and engine; shared naming or components with another model does not establish a match.",
        ),
      },
    ],
  },
  {
    slug: "citroen",
    name: "Citroën",
    ar: "سيتروين",
    models: [
      {
        slug: "c3",
        name: note("C3", "C3"),
        note: note(
          "وضّح هل السيارة C3 أم C3 Aircross؛ لا نعتبر الاسمين موديلًا واحدًا عند تأكيد توافق القطع.",
          "Specify C3 or C3 Aircross; these names are not treated as one model when confirming fitment.",
        ),
      },
      {
        slug: "c5",
        name: note("C5", "C5"),
        note: note(
          "ميّز C5 عن C5 Aircross واذكر الجيل والمحرك؛ توافق القطع يحتاج مطابقة صريحة للتكوين.",
          "Distinguish C5 from C5 Aircross and provide generation and engine; fitment requires an explicit configuration match.",
        ),
      },
    ],
  },
];

// Saved records are authoritative. Editorial targets may provide copy for an
// existing model, but must never recreate a deleted make or model in navigation.
export function coveredBrands(
  existing: { slug: string; name: string; ar: string; models: string[] }[],
) {
  return existing.map((brand) => ({
    ...brand,
    models: [...new Set(brand.models)],
  }));
}
export function targetModel(brand: string, model: string) {
  return targetBrands
    .find((b) => b.slug === brand)
    ?.models.find((m) => m.slug === model);
}
