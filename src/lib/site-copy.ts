import type { Locale } from "./catalog";

// Search copy is separate from promotional hero text so campaigns cannot replace it.
export const siteCopy = {
  ar: {
    name: "موبِك",
    heading: "قطع غيار سيارات أصلية بضمان في مصر",
    description:
      "قطع غيار أصلية لأوبل وشيفروليه وبيجو وستروين وإم جي في مصر من موبِك، بضمان الوكيل أو المورد حسب المنتج. راجع توافق القطعة وأسعارها بالجنيه المصري.",
  },
  en: {
    name: "MOPC",
    heading: "Genuine Car Parts with Warranty in Egypt",
    description:
      "Shop genuine Opel, Chevrolet, Peugeot, Citroën and MG spare parts in Egypt at MOPC, with agent or supplier warranties. Check fitment and prices in EGP.",
  },
} satisfies Record<
  Locale,
  { name: string; heading: string; description: string }
>;
