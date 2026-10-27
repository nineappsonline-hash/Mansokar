import { cookies } from "next/headers";
import { configured, searchCatalog, categoryCatalog } from "@/lib/db";
import { demoProducts, demoFits, normalize } from "@/lib/catalog";
import { enforceRate } from "@/lib/rate-limit";
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").slice(
    0,
    100,
  );
  if (query.length < 2) return Response.json({ products: [], categories: [] });
  try {
    await enforceRate(request, "suggest", 90);
  } catch {
    return Response.json(
      { error: "Search rate limit", products: [], categories: [] },
      { status: 429 },
    );
  }
  const vehicle = (await cookies()).get("vehicle")?.value;
  const products = configured()
    ? (await searchCatalog({ query, vehicle, size: 5 })).products
    : demoProducts
        .filter(
          (p) =>
            (!vehicle || demoFits(p.id, vehicle)) &&
            normalize(
              p.name.en +
                p.name.ar +
                p.partNumber +
                " " +
                (p.partNumbers ?? []).join(" ") +
                " " +
                JSON.stringify(p.synonyms ?? {}),
            ).includes(normalize(query)),
        )
        .slice(0, 5);
  const categories = (await categoryCatalog())
    .filter((c) =>
      normalize(c.name.en + " " + c.name.ar).includes(normalize(query)),
    )
    .slice(0, 5)
    .map((c) => ({ slug: c.slug, name: c.name }));
  return Response.json(
    {
      products: products.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        partNumber: p.partNumber,
      })),
      categories,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
