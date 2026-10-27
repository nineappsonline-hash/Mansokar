import Link from "next/link";
import { money } from "@/lib/catalog";
import { reportRange, summarizeOrders } from "@/lib/reporting";
import { reportOrders } from "@/lib/admin-reports";
export async function AdminReports({
  from,
  to,
  module,
}: {
  from?: string;
  to?: string;
  module: string;
}) {
  let range;
  try {
    range = reportRange(from, to);
  } catch (error) {
    return (
      <section className="panel">
        <p role="alert">{(error as Error).message}</p>
        <Link href={"/admin?module=" + module}>Reset report dates</Link>
      </section>
    );
  }
  const rows = await reportOrders(range);
  const summary = summarizeOrders(rows);
  const values = [
    ["Placed orders", summary.orders],
    ["Fully paid order totals", money(summary.paidRevenue, "en")],
    ["Cancelled / returned", `${summary.cancelled} / ${summary.returned}`],
  ];
  return (
    <div className="stack">
      <form className="panel filters">
        <input type="hidden" name="module" value={module} />
        <label>
          From (UTC)
          <input name="from" type="date" required defaultValue={range.from} />
        </label>
        <label>
          Through (UTC)
          <input name="to" type="date" required defaultValue={range.to} />
        </label>
        <button className="button">Apply dates</button>
        <a
          className="button secondary"
          href={`/api/admin-report?from=${range.from}&to=${range.to}`}
        >
          Export orders CSV
        </a>
      </form>
      <div className="three-col">
        {values.map(([label, value]) => (
          <article className="panel" key={label}>
            <h3>{label}</h3>
            <p className="price">{value}</p>
          </article>
        ))}
      </div>
      <p className="notice">
        Demo orders excluded. All orders within the selected period are
        included. Fully paid totals include delivery; they are not net profit.
        Cancelled/returned orders are counted separately.
      </p>
      <section className="panel">
        <h3>Product contribution after discounts</h3>
        <p>
          {summary.contribution === null
            ? "Unavailable: no fully paid orders, or historical item costs are missing."
            : money(summary.contribution, "en")}
        </p>
        <p className="muted">
          Excludes delivery revenue, fulfillment costs, payment fees and tax.
          Historical costs are never inferred from today’s product cost.
        </p>
      </section>
      <div className="two-col">
        {(
          [
            ["Manufacturer", summary.manufacturers],
            ["Category", summary.categories],
          ] as const
        ).map(([title, groups]) => (
          <section className="panel admin-list" key={title}>
            <h3>{title} · fully paid items</h3>
            <table>
              <thead>
                <tr>
                  <th>{title}</th>
                  <th>Units</th>
                  <th>Item sales before order discounts</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.name}>
                    <td>{g.name}</td>
                    <td>{g.units}</td>
                    <td>{money(g.sales, "en")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>
      <section className="panel admin-list">
        <h3>Daily trend</h3>
        <table>
          <thead>
            <tr>
              <th>Date (UTC)</th>
              <th>Orders</th>
              <th>Fully paid totals</th>
            </tr>
          </thead>
          <tbody>
            {summary.trends.map((p) => (
              <tr key={p.date}>
                <td>{p.date}</td>
                <td>{p.orders}</td>
                <td>{money(p.paid, "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel admin-list">
        <h3>Coupon usage · all placed orders</h3>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Orders</th>
              <th>Discount</th>
            </tr>
          </thead>
          <tbody>
            {summary.coupons.map((c) => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td>{c.orders}</td>
                <td>{money(c.discount, "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel admin-list">
        <h3>Orders</h3>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Date</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td>
                  <Link href={`/admin?module=orders&id=${o.id}`}>
                    {o.order_number}
                  </Link>
                </td>
                <td>{o.created_at.slice(0, 10)}</td>
                <td>{o.status}</td>
                <td>{o.payment_status}</td>
                <td>{money(o.total, "en")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p>No real orders in this period.</p>}
      </section>
    </div>
  );
}
