import { enforceRate } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { catalog, fitmentFlags, productImages, vehicleCatalog } from "@/lib/db";
import { fitmentLabel, type Locale } from "@/lib/catalog";
import { publicProduct, carContext } from "@/lib/public-product";
import { readApplications } from "@/lib/product-applications";
export async function GET(request: Request) {
  try {
    await enforceRate(request, "products", 90);
  } catch {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const params = new URL(request.url).searchParams;
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);
  if (ids.length > 40 || ids.some((id) => !/^[-_a-zA-Z0-9]{1,100}$/.test(id)))
    return Response.json({ error: "Invalid product IDs" }, { status: 400 });
  const locale: Locale = params.get("locale") === "ar" ? "ar" : "en";
  const products = await catalog({ ids });
  const imageRows = await Promise.all(
    ids.map((id) => productImages(id).then((imgs) => ({ id, imgs }))),
  );
  const imageMap = new Map<string, string>();
  for (const { id, imgs } of imageRows) {
    if (imgs[0]?.url) imageMap.set(id, imgs[0].url);
  }
  const id = (await cookies()).get("vehicle")?.value;
  const { vehicles, models, brands } = await vehicleCatalog();
  const vehicle = vehicles.find((v) => v.id === id);
  const flags = await fitmentFlags(ids, vehicle?.id);
  // Canonical storefront compatibility lives in specs.car_years:<model_id>.
  // The legacy product_fitments table is empty for this catalog.
  const modelMap = new Map(models.map((model) => [model.id, model]));
  const compatibleVehicles: Record<string, { brand: string; model: string; year: number }[]> = {};
  for (const product of products) {
    compatibleVehicles[product.id] = readApplications(product.specs)
      .flatMap((application) => {
        const model = modelMap.get(application.model_id);
        if (!model) return [];
        return application.years.map((year) => ({
          brand: model.brand,
          model: model.name[locale] || model.slug,
          year,
        }));
      });
  }
  return Response.json(
    {
      products: products.map((p) => ({
        ...publicProduct(
          p,
          vehicle
            ? carContext(
                {
                  make: vehicle.brand,
                  model: vehicle.model,
                  year: vehicle.year,
                },
                models,
                brands,
              )
            : undefined,
          flags[p.id],
        ),
        imageUrl: imageMap.get(p.id) ?? null,
      })),
      compatibleVehicles,
      fitments: Object.fromEntries(
        products.map((p) => [
          p.id,
          fitmentLabel(vehicle, !!flags[p.id], locale),
        ]),
      ),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
