import { enforceRate } from "@/lib/rate-limit";
import { cookies } from "next/headers";
import { catalog, fitmentFlags, vehicleCatalog } from "@/lib/db";
import { fitmentLabel, type Locale } from "@/lib/catalog";
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
  const id = (await cookies()).get("vehicle")?.value;
  const { vehicles } = await vehicleCatalog();
  const vehicle = vehicles.find((v) => v.id === id);
  const flags = await fitmentFlags(ids, vehicle?.id);
  return Response.json(
    {
      products,
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
