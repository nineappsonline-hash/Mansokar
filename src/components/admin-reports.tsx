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
        <Link href={"/admin?module=" + module}>إعادة ضبط فترة التقرير</Link>
      </section>
    );
  }
  const rows = await reportOrders(range);
  const summary = summarizeOrders(rows);
  const values = [
    ["الطلبات المسجلة", summary.orders],
    ["إجمالي الطلبات المدفوعة بالكامل", money(summary.paidRevenue, "ar")],
    ["ملغاة / مرتجعة", `${summary.cancelled} / ${summary.returned}`],
  ];
  return (
    <div className="stack admin-reports-redesign" lang="ar" dir="rtl">
      <form className="panel filters">
        <input type="hidden" name="module" value={module} />
        <label>
          من تاريخ (UTC)
          <input name="from" type="date" required defaultValue={range.from} />
        </label>
        <label>
          إلى تاريخ (UTC)
          <input name="to" type="date" required defaultValue={range.to} />
        </label>
        <button className="button">تطبيق الفترة</button>
        <a
          className="button secondary"
          href={`/api/admin-report?from=${range.from}&to=${range.to}`}
        >
          تصدير الطلبات CSV
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
        الطلبات التجريبية مستبعدة. التقرير يشمل كل الطلبات في الفترة المحددة. إجمالي الطلبات المدفوعة يشمل الشحن، لكنه مش صافي الربح. الطلبات الملغاة والمرتجعة محسوبة بشكل منفصل.
      </p>
      <section className="panel">
        <h3>مساهمة المنتجات بعد الخصومات</h3>
        <p>
          {summary.contribution === null
            ? "غير متاح: مفيش طلبات مدفوعة بالكامل أو تكلفة بعض المنتجات وقت البيع مش مسجلة."
            : money(summary.contribution, "ar")}
        </p>
        <p className="muted">
          المساهمة لا تشمل إيراد الشحن أو تكلفة التنفيذ أو رسوم الدفع أو الضرائب. تكلفة المنتجات التاريخية لا يتم تقديرها من السعر الحالي.
        </p>
      </section>
      <div className="stack">
        {([["العلامة التجارية للقطعة", summary.manufacturers]] as const).map(
          ([title, groups]) => (
            <section className="panel admin-list" key={title}>
              <h3>{title} · القطع المدفوعة بالكامل</h3>
              <table>
                <thead>
                  <tr>
                    <th>{title}</th>
                    <th>الكمية</th>
                    <th>مبيعات القطع قبل خصومات الطلب</th>
                  </tr>
                </thead>
                <tbody>
                  {!groups.length && (
                    <tr>
                      <td colSpan={3}>مفيش مبيعات قطع مدفوعة في الفترة دي.</td>
                    </tr>
                  )}
                  {groups.map((g) => (
                    <tr key={g.name}>
                      <td>{g.name}</td>
                      <td>{g.units}</td>
                      <td>{money(g.sales, "ar")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ),
        )}
      </div>
      <section className="panel admin-list">
        <h3>المبيعات والطلبات اليومية</h3>
        <table>
          <thead>
            <tr>
              <th>التاريخ (UTC)</th>
              <th>Orders</th>
              <th>إجمالي المدفوع بالكامل</th>
            </tr>
          </thead>
          <tbody>
            {summary.trends.map((p) => (
              <tr key={p.date}>
                <td>{p.date}</td>
                <td>{p.orders}</td>
                <td>{money(p.paid, "ar")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="panel admin-list">
        <h3>استخدام الكوبونات · جميع الطلبات</h3>
        <table>
          <thead>
            <tr>
              <th>الكود</th>
              <th>Orders</th>
              <th>الخصم</th>
            </tr>
          </thead>
          <tbody>
            {summary.coupons.map((c) => (
              <tr key={c.code}>
                <td>{c.code}</td>
                <td>{c.orders}</td>
                <td>{money(c.discount, "ar")}</td>
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
              <th>الحالة</th>
              <th>الدفع</th>
              <th>الإجمالي</th>
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
