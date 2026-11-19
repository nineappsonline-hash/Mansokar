import { requireAdmin, allRows, vehicleCatalog } from "@/lib/db";
import { exportCsv } from "@/lib/spreadsheets";
import { exportItemWorkbook } from "@/lib/item-workbook";
import { enforceRate } from "@/lib/rate-limit";
import {
  matchesProductExportFilter,
  parseProductExportFilter,
} from "@/lib/export-filter";
import type { Product } from "@/lib/catalog";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    await enforceRate(request, "admin-export", 10);
    const [products, fitments, images, categories] = await Promise.all([
      allRows<Product>("products"),
      allRows<{ product_id: string; vehicle_config_id: string }>(
        "product_fitments",
      ),
      allRows<any>("product_images"),
      allRows<{ slug: string; name: { ar: string; en: string } }>("categories"),
    ]);
    const byProduct = new Map<string, string[]>();
    for (const f of fitments)
      byProduct.set(f.product_id, [
        ...(byProduct.get(f.product_id) ?? []),
        f.vehicle_config_id,
      ]);
    const imageCounts = new Map<string, number>();
    for (const image of images)
      imageCounts.set(
        image.product_id,
        (imageCounts.get(image.product_id) ?? 0) + 1,
      );
    const { vehicles, models } = await vehicleCatalog();
    const params = new URL(request.url).searchParams;
    const filter = parseProductExportFilter(params);
    const filtered = products.filter((product) =>
      matchesProductExportFilter(
        product,
        {
          fitmentIds: byProduct.get(product.id),
          imageCount: imageCounts.get(product.id),
        },
        { vehicles, models },
        filter,
      ),
    );
    const template = params.get("template") === "true";
    const rows = filtered.flatMap((p) => {
      const ids = byProduct.get(p.id);
      return ids?.length
        ? ids.map((id) => ({ ...p, vehicle_config_id: id }))
        : [p];
    });
    const xlsx = params.get("format") === "xlsx";
    return new Response(
      xlsx
        ? new Uint8Array(
            await exportItemWorkbook(
              template
                ? []
                : filtered.map((p) => ({
                    ...p,
                    fitments: byProduct.get(p.id) || [],
                    images: images
                      .filter((i) => i.product_id === p.id)
                      .map((i) => ({ path: i.path, alt: i.alt })),
                  })),
              vehicles,
              models,
              categories,
            ),
          )
        : "\uFEFF" + exportCsv(rows),
      {
        headers: {
          "Content-Type": xlsx
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mopc-products.${xlsx ? "xlsx" : "csv"}"`,
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Export unavailable";
    return Response.json(
      {
        error: ["Unauthorized", "Forbidden"].includes(message)
          ? "Administrator access required"
          : message.startsWith("Too many")
            ? message
            : "Export unavailable",
      },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message === "Forbidden"
              ? 403
              : message.startsWith("Too many")
                ? 429
                : 503,
      },
    );
  }
}
