import type { Locale } from "./catalog";

// Search copy is separate from promotional hero text so campaigns cannot replace it.
export const siteCopy = {
  ar: {
    name: "موبِك",
    heading: "قطع غيار سيارات في مصر حسب الماركة والموديل",
    description:
      "تسوق قطع غيار أوبل وشيفروليه وبيجو وستروين وإم جي في مصر من موبِك. ابحث برقم القطعة أو ماركة وموديل عربيتك، وراجع التوافق والسعر قبل الطلب.",
  },
  en: {
    name: "MOPC",
    heading: "Car Spare Parts in Egypt by Make and Model",
    description:
      "Shop Opel, Chevrolet, Peugeot, Citroën and MG car spare parts in Egypt. Search by part number, make and model, then review fitment, prices and product-specific terms before ordering.",
  },
} satisfies Record<
  Locale,
  { name: string; heading: string; description: string }
>;
