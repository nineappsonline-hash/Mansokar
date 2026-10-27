import { requireAdmin, allRows } from "@/lib/db";
import { exportCsv, exportXlsx } from "@/lib/spreadsheets";
import { enforceRate } from "@/lib/rate-limit";
import type { Product } from "@/lib/catalog";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    await enforceRate(request, "admin-export", 10);
    const [products, fitments] = await Promise.all([
      allRows<Product>("products"),
      allRows<{ product_id: string; vehicle_config_id: string }>(
        "product_fitments",
      ),
    ]);
    const byProduct = new Map<string, string[]>();
    for (const f of fitments)
      byProduct.set(f.product_id, [
        ...(byProduct.get(f.product_id) ?? []),
        f.vehicle_config_id,
      ]);
    const rows = products.flatMap((p) => {
      const ids = byProduct.get(p.id);
      return ids?.length
        ? ids.map((id) => ({ ...p, vehicle_config_id: id }))
        : [p];
    });
    const xlsx = new URL(request.url).searchParams.get("format") === "xlsx";
    return new Response(
      xlsx
        ? new Uint8Array(await exportXlsx(rows))
        : "\uFEFF" + exportCsv(rows),
      {
        headers: {
          "Content-Type": xlsx
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mansokar-products.${xlsx ? "xlsx" : "csv"}"`,
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
