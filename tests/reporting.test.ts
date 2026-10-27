import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reportRange,
  summarizeOrders,
  type ReportOrder,
} from "../src/lib/reporting";
const order: ReportOrder = {
  id: "one",
  order_number: "MKS-1",
  created_at: "2026-10-27T10:00:00Z",
  status: "delivered",
  payment_status: "paid",
  subtotal: 10000,
  discount: 1000,
  shipping_amount: 500,
  total: 9500,
  order_items: [
    {
      snapshot: {
        sku: "ONE",
        manufacturer: "Maker",
        category: "filters",
        price: 5000,
      },
      quantity: 2,
      cost_snapshot: 2000,
    },
  ],
  coupon_redemptions: [{ code: "SAVE" }],
};
test("reports use inclusive dates, validate real calendar days and bound export periods", () => {
  assert.deepEqual(reportRange("2026-10-01", "2026-10-27"), {
    from: "2026-10-01",
    to: "2026-10-27",
    start: "2026-10-01T00:00:00.000Z",
    end: "2026-10-28T00:00:00.000Z",
  });
  assert.throws(() => reportRange("2026-02-30", "2026-03-01"));
  assert.throws(() => reportRange("2026-10-28", "2026-10-27"));
  assert.throws(() => reportRange("2020-01-01", "2026-10-27"));
});
test("reports include more than 500 orders and separate revenue, item sales, contribution and cancellations", () => {
  const rows = Array.from({ length: 601 }, (_, i) => ({
    ...order,
    id: String(i),
  }));
  rows.push({
    ...order,
    id: "cancelled",
    status: "cancelled",
    payment_status: "unpaid",
  });
  const summary = summarizeOrders(rows);
  assert.equal(summary.orders, 602);
  assert.equal(summary.paidRevenue, 601 * 9500);
  assert.equal(summary.contribution, 601 * 5000);
  assert.equal(summary.cancelled, 1);
  assert.deepEqual(summary.manufacturers, [
    { name: "Maker", units: 1202, sales: 601 * 10000 },
  ]);
  assert.equal(summary.coupons[0].orders, 602);
  assert.equal(summary.trends[0].orders, 602);
});
test("missing historical costs suppress contribution instead of inventing a margin", () => {
  assert.equal(
    summarizeOrders([
      {
        ...order,
        order_items: [{ ...order.order_items[0], cost_snapshot: null }],
      },
    ]).contribution,
    null,
  );
  assert.equal(summarizeOrders([]).contribution, null);
});
