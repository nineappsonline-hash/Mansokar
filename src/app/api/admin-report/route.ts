import { requireAdmin } from "@/lib/db";
import { reportOrders } from "@/lib/admin-reports";
import { reportRange } from "@/lib/reporting";
import { enforceRate } from "@/lib/rate-limit";
import { csvCell } from "@/lib/importer";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    await enforceRate(request, "admin-report", 10);
    const params = new URL(request.url).searchParams;
    const range = reportRange(
      params.get("from") ?? undefined,
      params.get("to") ?? undefined,
    );
    const rows = await reportOrders(range);
    const columns = [
      "order_number",
      "created_at",
      "status",
      "payment_status",
      "subtotal",
      "discount",
      "shipping_amount",
      "total",
    ] as const;
    const csv = [
      columns.join(","),
      ...rows.map((o) => columns.map((k) => csvCell(o[k])).join(",")),
    ].join("\r\n");
    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="mansokar-orders-${range.from}-${range.to}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Report unavailable";
    return Response.json(
      { error: message },
      {
        status:
          message === "Unauthorized"
            ? 401
            : message === "Forbidden"
              ? 403
              : message.startsWith("Too many")
                ? 429
                : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
