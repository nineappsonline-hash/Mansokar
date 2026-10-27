import "server-only";
import { service } from "./db";
import { reportRange, type ReportOrder } from "./reporting";
export async function reportOrders(
  range: ReturnType<typeof reportRange>,
): Promise<ReportOrder[]> {
  const rows: ReportOrder[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await service()
      .from("orders")
      .select(
        "id,order_number,created_at,status,payment_status,subtotal,discount,shipping_amount,total,order_items(snapshot,quantity,cost_snapshot),coupon_redemptions(code)",
      )
      .eq("demo", false)
      .gte("created_at", range.start)
      .lt("created_at", range.end)
      .order("created_at")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw error;
    rows.push(
      ...(data.map((row) => ({
        ...row,
        coupon_redemptions: Array.isArray(row.coupon_redemptions)
          ? row.coupon_redemptions
          : row.coupon_redemptions
            ? [row.coupon_redemptions]
            : [],
        order_items: row.order_items ?? [],
      })) as ReportOrder[]),
    );
    if (data.length < 500) break;
  }
  return rows;
}
