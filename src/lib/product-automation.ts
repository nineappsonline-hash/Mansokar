import type { Text } from "./catalog";
export function automaticProduct(input: {
  name: Text;
  manufacturer: string;
  partNumber: string;
  vehicles: { name: Text }[];
  months: number | null;
  sku: string;
  slug?: string;
}) {
  const vehicle = {
    ar: input.vehicles.map((v) => v.name.ar).join("، "),
    en: input.vehicles.map((v) => v.name.en).join(", "),
  };
  const description = {
    ar: `${input.name.ar} من ماركة ${input.manufacturer}${vehicle.ar ? ` لعربيات ${vehicle.ar}` : ""}. رقم القطعة ${input.partNumber}. راجع رقم القطعة ومواصفات العربية قبل الشراء في مصر.`,
    en: `${input.name.en} by ${input.manufacturer}${vehicle.en ? ` for ${vehicle.en}` : ""}. Part number ${input.partNumber}. Check the part number and vehicle configuration before purchasing in Egypt.`,
  };
  const stem = `${input.name.en} ${input.manufacturer}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/, "");
  return {
    sku: input.sku,
    slug:
      input.slug || `${stem || "spare-part-egypt"}-${input.sku.toLowerCase()}`,
    description,
    warranty:
      input.months === null
        ? null
        : {
            ar: `ضمان المورد ${input.months} شهر حسب شروط ضمان المنتج.`,
            en: `${input.months}-month supplier warranty subject to the product warranty terms.`,
          },
    seo: {
      title: {
        ar: `${input.name.ar} ${input.manufacturer}${vehicle.ar ? ` ${vehicle.ar}` : ""} في مصر`.slice(
          0,
          200,
        ),
        en: `${input.name.en} ${input.manufacturer}${vehicle.en ? ` ${vehicle.en}` : ""} in Egypt`.slice(
          0,
          200,
        ),
      },
      description: {
        ar: description.ar.slice(0, 500),
        en: description.en.slice(0, 500),
      },
    },
  };
}
