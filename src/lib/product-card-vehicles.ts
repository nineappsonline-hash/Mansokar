import { formatYearRanges as yearRanges } from "./vehicle-year-ranges";
import type { Locale, Product, Text } from "./catalog";
import type { CarContext } from "./public-product";
import { readApplications } from "./product-applications";

export type CardCarCatalog = {
  brands: { slug: string; name: string; ar: string }[];
  models: { id: string; brand: string; slug: string; name: Text }[];
};

export function productCardVehicles(
  product: Pick<Product, "specs">,
  catalog: CardCarCatalog,
  locale: Locale,
  context?: CarContext,
  verified = false,
) {
  const applications = readApplications(product.specs);
  if (context) {
    const application = applications.find(
      (a) => a.model_id === context.modelId,
    );
    if (
      !verified &&
      (!application ||
        (context.year && application.years.length > 0 && !application.years.includes(context.year)))
    )
      return [];
    const model = catalog.models.find((m) => m.id === context.modelId);
    const brand = catalog.brands.find((b) => b.slug === context.make);
    const name =
      model && brand
        ? `${locale === "ar" ? brand.ar : brand.name} ${model.name[locale]}`
        : context.name[locale].replace(
            context.year ? new RegExp(`\\s${context.year}$`) : /$/,
            "",
          );
    return [
      {
        id: context.modelId,
        name,
        years: yearRanges(
          context.year ? [context.year] : (application?.years ?? []),
        ),
      },
    ];
  }
  return applications.flatMap((application) => {
    const model = catalog.models.find((m) => m.id === application.model_id);
    const brand = catalog.brands.find((b) => b.slug === model?.brand);
    if (!model || !brand) return [];
    return [
      {
        id: model.id,
        name: `${locale === "ar" ? brand.ar : brand.name} ${model.name[locale]}`,
        years: yearRanges(application.years),
      },
    ];
  });
}
