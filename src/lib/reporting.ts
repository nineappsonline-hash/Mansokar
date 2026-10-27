export type ReportItem = {
  snapshot: {
    sku?: string;
    name?: { en: string };
    manufacturer?: string;
    category?: string;
    price: number;
  };
  quantity: number;
  cost_snapshot: number | null;
};
export type ReportOrder = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  shipping_amount: number;
  total: number;
  order_items: ReportItem[];
  coupon_redemptions: { code: string }[];
};
export function reportRange(from?: string, to?: string, now = new Date()) {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const end = to || day(now);
  const start = from || day(new Date(now.getTime() - 29 * 86400000));
  const parse = (s: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw Error("Use valid report dates");
    const d = new Date(s + "T00:00:00Z");
    if (!Number.isFinite(d.getTime()) || day(d) !== s)
      throw Error("Use valid report dates");
    return d;
  };
  const a = parse(start),
    b = parse(end);
  if (b < a || b.getTime() - a.getTime() > 365 * 86400000)
    throw Error("Choose a date range of 1–366 days");
  return {
    from: start,
    to: end,
    start: a.toISOString(),
    end: new Date(b.getTime() + 86400000).toISOString(),
  };
}
export function summarizeOrders(rows: ReportOrder[]) {
  const paid = rows.filter((o) => o.payment_status === "paid");
  const groups = (key: "manufacturer" | "category") => {
    const result = new Map<
      string,
      { name: string; units: number; sales: number }
    >();
    for (const order of paid)
      for (const item of order.order_items) {
        const name = item.snapshot[key] || "Not captured";
        const row = result.get(name) || { name, units: 0, sales: 0 };
        row.units += item.quantity;
        row.sales += item.quantity * Number(item.snapshot.price);
        result.set(name, row);
      }
    return [...result.values()].sort((a, b) => b.sales - a.sales);
  };
  const trends = new Map<
    string,
    { date: string; orders: number; paid: number }
  >();
  const coupons = new Map<
    string,
    { code: string; orders: number; discount: number }
  >();
  for (const order of rows) {
    const date = order.created_at.slice(0, 10);
    const point = trends.get(date) || { date, orders: 0, paid: 0 };
    point.orders++;
    if (order.payment_status === "paid") point.paid += Number(order.total);
    trends.set(date, point);
    for (const r of order.coupon_redemptions) {
      const c = coupons.get(r.code) || { code: r.code, orders: 0, discount: 0 };
      c.orders++;
      c.discount += Number(order.discount);
      coupons.set(r.code, c);
    }
  }
  const costsComplete =
    paid.length > 0 &&
    paid.every(
      (o) =>
        o.order_items.length > 0 &&
        o.order_items.every(
          (i) => i.cost_snapshot !== null && i.cost_snapshot !== undefined,
        ),
    );
  const contribution = costsComplete
    ? paid.reduce(
        (sum, o) =>
          sum +
          Number(o.subtotal) -
          Number(o.discount) -
          o.order_items.reduce(
            (cost, i) => cost + Number(i.cost_snapshot) * i.quantity,
            0,
          ),
        0,
      )
    : null;
  return {
    orders: rows.length,
    paidOrders: paid.length,
    paidRevenue: paid.reduce((sum, o) => sum + Number(o.total), 0),
    cancelled: rows.filter((o) => o.status === "cancelled").length,
    returned: rows.filter((o) => o.status === "returned").length,
    contribution,
    manufacturers: groups("manufacturer"),
    categories: groups("category"),
    trends: [...trends.values()].sort((a, b) => a.date.localeCompare(b.date)),
    coupons: [...coupons.values()],
  };
}
