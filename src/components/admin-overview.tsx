import Link from "next/link";
import { service } from "@/lib/db";
import { money } from "@/lib/catalog";

const orderLabels: Record<string, string> = {
  pending_confirmation: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  processing: "جاري التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
  returned: "مرتجع",
};

export async function AdminOverview() {
  const db = service();
  const [
    newOrders,
    processingOrders,
    pendingTransfers,
    openMessages,
    openInquiries,
    latestOrders,
  ] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending_confirmation").eq("demo", false),
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["confirmed", "processing", "shipped"]).eq("demo", false),
    db.from("manual_transfers").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("contact_messages").select("id", { count: "exact", head: true }),
    db.from("part_requests").select("id", { count: "exact", head: true }).eq("status", "new"),
    db.from("orders").select("id,order_number,status,payment_status,total,created_at,customer").eq("demo", false).order("created_at", { ascending: false }).limit(6),
  ]);
  const results = [newOrders, processingOrders, pendingTransfers, openMessages, openInquiries, latestOrders];
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  const cards = [
    { label: "طلبات تحتاج تأكيد", count: newOrders.count ?? 0, href: "/admin?module=orders" },
    { label: "طلبات قيد التنفيذ", count: processingOrders.count ?? 0, href: "/admin?module=orders" },
    { label: "تحويلات تنتظر المراجعة", count: pendingTransfers.count ?? 0, href: "/admin?module=orders" },
    { label: "رسائل العملاء", count: openMessages.count ?? 0, href: "/admin?module=messages" },
    { label: "استفسارات قطع الغيار الجديدة", count: openInquiries.count ?? 0, href: "/admin?module=inquiries" },
  ];
  const priority = cards.filter((card) => card.count > 0);
  return (
    <div className="stack" lang="ar" dir="rtl">
      <section className="panel stack">
        <h2>نظرة عامة على المتجر</h2>
        <p className="muted">تابع الطلبات والمدفوعات واستفسارات العملاء من مكان واحد. الأرقام من بيانات المتجر الحالية، وليست بيانات تجريبية.</p>
        <div className="three-col">
          {cards.map((card) => (
            <Link className="panel" key={card.label} href={card.href} style={{ textDecoration: "none", color: "inherit" }}>
              <span className="muted">{card.label}</span>
              <strong style={{ display: "block", fontSize: "2rem", marginTop: 8 }}>{card.count.toLocaleString("ar-EG")}</strong>
              <span>عرض التفاصيل ←</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="panel stack">
        <h2>محتاج اهتمامك</h2>
        {priority.length ? (
          <div className="stack">
            {priority.map((card) => (
              <Link key={card.label} href={card.href} className="notice" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span>{card.label}</span><strong>{card.count.toLocaleString("ar-EG")}</strong>
              </Link>
            ))}
          </div>
        ) : <p className="notice">مفيش طلبات أو تحويلات أو استفسارات جديدة في القوائم المتابعة حاليًا.</p>}
        <p className="muted">عدد رسائل العملاء يشمل كل الرسائل المسجلة، لأننا لسه ما تحققناش من وجود حالة «مقروء/غير مقروء» لها.</p>
      </section>
      <section className="panel stack">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <h2>آخر الطلبات</h2><Link href="/admin?module=orders">عرض كل الطلبات</Link>
        </div>
        {latestOrders.data?.length ? (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead><tr><th>رقم الطلب</th><th>العميل</th><th>الحالة</th><th>الدفع</th><th>الإجمالي</th><th>التفاصيل</th></tr></thead>
              <tbody>
                {latestOrders.data.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{(order.customer as { name?: string } | null)?.name ?? "—"}</td>
                    <td>{orderLabels[order.status] ?? order.status.replaceAll("_", " ")}</td>
                    <td>{order.payment_status === "paid" ? "مدفوع" : order.payment_status === "pending" ? "بانتظار الدفع" : order.payment_status.replaceAll("_", " ")}</td>
                    <td>{money(order.total, "ar")}</td>
                    <td><Link href={`/admin?module=orders&id=${order.id}`}>فتح الطلب</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="notice">لسه مفيش طلبات حقيقية. أول طلب جديد هيظهر هنا تلقائيًا.</p>}
      </section>
      <section className="panel">
        <Link href="/admin?module=reports">فتح تقارير المبيعات والتحصيل بالتفصيل ←</Link>
      </section>
    </div>
  );
}
