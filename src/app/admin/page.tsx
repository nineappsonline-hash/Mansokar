import { AdminCheckoutReadiness } from "@/components/admin-checkout-readiness";
import { AdminOverview } from "@/components/admin-overview";
import { AdminCoupon } from "@/components/admin-coupon";
import { AdminSeo } from "@/components/admin-seo";
import { AdminProducts } from "@/components/admin-products";
import { redirect } from "next/navigation";
import { AdminWorkspace, AdminSignIn } from "@/components/admin-workspace";
import { SimpleProductEditor } from "@/components/simple-product-editor";
import {
  ShippingRateEditor,
  FreeShippingEditor,
} from "@/components/admin-shipping";
import { governorates } from "@/lib/shipping";
import { AdminVehicles } from "@/components/admin-vehicles";
import { HeroSlidesEditor } from "@/components/admin-hero-slides";
import { AdminCustomers } from "@/components/admin-customers";
import { AdminReports } from "@/components/admin-reports";
import Link from "next/link";
import {
  requireAdmin,
  service,
  configured,
  allRows,
  vehicleCatalog,
  siteMedia,
} from "@/lib/db";
import { AuthForm, ApiForm } from "@/components/forms";
import {
  Importer,
  ImageManager,
  BrandingMedia,
  MerchantForm,
  RelationsEditor,
} from "@/components/admin-editor";
import { money } from "@/lib/catalog";
import { isRemoteImageUrl } from "@/lib/image-links";
const orderStatusLabels: Record<string, string> = {
  pending_confirmation: "Awaiting confirmation",
  confirmed: "Confirmed",
  processing: "Preparing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
const paymentStatusLabels: Record<string, string> = {
  unpaid: "لم يتم الدفع",
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};
const allowedNextOrderStatuses: Record<string, string[]> = {
  pending_confirmation: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
const humanStatus = (value: string, labels: Record<string, string>) =>
  labels[value] ?? value.replaceAll("_", " ");
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<{
    module?: string;
    id?: string;
    from?: string;
    to?: string;
    q?: string;
    page?: string;
    view?: string;
    tab?: string;
    status?: string;
  }>;
}) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return (
      <AdminSignIn>
        <AuthForm
          locale="en"
          configured={configured()}
          allowSignup={false}
          destination="admin"
        />
      </AdminSignIn>
    );
  }
  const {
    module = "overview",
    id,
    from,
    to,
    q,
    page,
    view,
    tab,
    status,
  } = await searchParams;
  if (["images", "fitments", "taxonomy", "import"].includes(module)) {
    const destination = new URLSearchParams({ module: "products" });
    if (id && module !== "taxonomy") destination.set("id", id);
    if (module === "images") destination.set("tab", "photos");
    if (module === "fitments") destination.set("tab", "vehicles");
    if (module === "taxonomy") destination.set("view", "brands");
    if (module === "import") destination.set("view", "excel");
    redirect("/admin?" + destination.toString());
  }
  if (
    ![
      "overview",
      "reports",
      "seo",
      "analytics",
      "products",
      "customers",
      "hero-slideshow",
      "branding",
      "recommendations",
      "campaigns",
      "shipping",
      "cms",
      "orders",
      "messages",
      "inquiries",
      "vehicles",
      "promotions",
      "settings",
    ].includes(module)
  )
    redirect("/admin");
  const db = service();
  let content: React.ReactNode;
  if (module === "overview") {
    content = (
      <div className="stack">
        <AdminOverview />
        <AdminCheckoutReadiness />
      </div>
    );
  } else if (module === "reports") {
    content = <AdminReports module={module} from={from} to={to} />;
  } else if (module === "seo") content = <AdminSeo />;
  else if (module === "analytics") {
    const { data, error } = await db
      .from("analytics_events")
      .select("event,amount")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw error;
    const counts = (data ?? []).reduce((acc: Record<string, number>, row) => {
      acc[row.event] = (acc[row.event] ?? 0) + 1;
      return acc;
    }, {});
    content = (
      <div className="panel">
        <h2>Storefront activity</h2>
        <p>
          Enabled: {process.env.ANALYTICS_ENABLED === "true" ? "Yes" : "No"}.
          Consent required; no contact details, search queries or browser
          purchase events accepted. Latest 1000 records.
        </p>
        {Object.keys(counts).length ? (
          <table>
            <thead>
              <tr>
                <th>Activity</th>
                <th>Events</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([event, count]) => (
                  <tr key={event}>
                    <td>{event.replaceAll("_", " ")}</td>
                    <td>{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <p className="notice">
            No activity recorded yet. Events appear here after visitors consent
            to analytics and tracking is enabled.
          </p>
        )}
      </div>
    );
  } else if (module === "products") {
    const [
      products,
      manufacturers,
      fitments,
      productImages,
      { vehicles, brands, models },
    ] = await Promise.all([
      allRows<any>("products"),
      allRows<any>("manufacturers"),
      allRows<any>("product_fitments"),
      allRows<any>("product_images", "id,product_id,path,alt,position"),
      vehicleCatalog(),
    ]);
    const exportYears = [
      ...new Set([
        ...vehicles.map((vehicle: any) => vehicle.year),
        ...products.flatMap((product: any) =>
          Object.entries(product.specs || {})
            .filter(([key]) => key.startsWith("car_years:"))
            .flatMap(([, value]) =>
              String(value)
                .split(",")
                .map((year) => Number(year)),
            ),
        ),
      ]),
    ]
      .filter((year) => Number.isInteger(year) && year >= 1950 && year <= 2100)
      .sort((a, b) => b - a);
    const selected = products.find((p) => p.id === id);
    const images = selected
      ? productImages
          .filter((image) => image.product_id === selected.id)
          .sort((a, b) => a.position - b.position)
      : [];
    const initialImages = await Promise.all(
      images.map(async (image) => {
        if (isRemoteImageUrl(image.path)) return { ...image, url: image.path };
        const { data, error } = await db.storage
          .from("catalog-images")
          .createSignedUrl(image.path, 600);
        if (error) throw error;
        return { ...image, url: data.signedUrl };
      }),
    );
    const firstImage = new Map<string, any>();
    const photoCounts = new Map<string, number>();
    for (const image of [...productImages].sort(
      (a, b) => a.position - b.position,
    )) {
      photoCounts.set(
        image.product_id,
        (photoCounts.get(image.product_id) ?? 0) + 1,
      );
      if (!firstImage.has(image.product_id))
        firstImage.set(image.product_id, image);
    }
    const productById = new Map(
      products.map((product) => [product.id, product]),
    );
    const signedPaths = [
      ...new Set(
        [...firstImage.entries()]
          .filter(([productId, image]) => {
            const product = productById.get(productId);
            return (
              !isRemoteImageUrl(image.path) &&
              !(product?.status === "published" && !product.demo)
            );
          })
          .map(([, image]) => image.path as string),
      ),
    ];
    const signedUrls = new Map<string, string>();
    for (let offset = 0; offset < signedPaths.length; offset += 100) {
      const { data, error } = await db.storage
        .from("catalog-images")
        .createSignedUrls(signedPaths.slice(offset, offset + 100), 600);
      if (error) break;
      for (const image of data ?? [])
        if (image.path && image.signedUrl && !image.error)
          signedUrls.set(image.path, image.signedUrl);
    }
    const productPictures = Object.fromEntries(
      [...firstImage.entries()].map(([productId, image]) => {
        const product = productById.get(productId);
        const url = isRemoteImageUrl(image.path)
          ? image.path
          : product?.status === "published" && !product.demo
            ? `/product-media/${image.id}`
            : signedUrls.get(image.path) || "";
        return [productId, { url, count: photoCounts.get(productId) ?? 0 }];
      }),
    );
    content =
      id && !selected ? (
        <section className="panel admin-empty">
          <h2>Product not found</h2>
          <p>
            This product may have been deleted. Choose an existing product or
            create a new one.
          </p>
          <Link className="button secondary" href="/admin?module=products">
            Back to products
          </Link>
        </section>
      ) : (
        <AdminProducts
          products={products}
          images={productPictures}
          fitments={fitments}
          vehicles={vehicles}
          carBrands={brands}
          carModels={models}
          manufacturers={manufacturers.map((m) => m.name)}
          selectedId={selected?.id}
          initialView={
            view === "brands" || view === "excel" ? view : "products"
          }
          initialTab={tab === "photos" || tab === "vehicles" ? tab : "details"}
          editor={
            <SimpleProductEditor
              key={id}
              manufacturers={manufacturers.map((m) => m.name)}
              vehicles={vehicles}
              brands={brands}
              models={models}
              selected={fitments
                .filter((f) => f.product_id === id)
                .map((f) => f.vehicle_config_id)}
              initial={selected ?? {}}
            />
          }
          photos={
            <ImageManager
              key={selected?.id}
              products={products}
              product={selected?.id ?? ""}
              initial={initialImages}
              fixedProduct
            />
          }
          excel={
            <Importer
              carBrands={brands.map((brand) => ({
                slug: brand.slug,
                name: brand.name,
              }))}
              carModels={models.map((model) => ({
                slug: model.slug,
                brand: model.brand,
                name: model.name,
              }))}
              itemBrands={manufacturers.map((brand) => brand.name)}
              years={exportYears}
            />
          }
        />
      );
  } else if (module === "customers") {
    content = <AdminCustomers actor={admin.id} id={id} q={q} page={page} />;
  } else if (module === "hero-slideshow") {
    const [{ data: rows, error }, { data: settings, error: settingsError }] =
      await Promise.all([
        db
          .from("hero_slides")
          .select("id,path,alt,enabled,position")
          .order("position")
          .order("id"),
        db
          .from("site_settings")
          .select("value")
          .eq("key", "hero_slideshow")
          .maybeSingle(),
      ]);
    if (error || settingsError) throw error || settingsError;
    const signed = rows.length
      ? await db.storage.from("catalog-images").createSignedUrls(
          rows.map((r) => r.path),
          600,
        )
      : null;
    const urls = new Map(
      (signed?.data ?? []).map((r) => [r.path, r.signedUrl ?? ""]),
    );
    content = (
      <HeroSlidesEditor
        initial={rows.map((r) => ({ ...r, url: urls.get(r.path) ?? "" }))}
        intervalSeconds={settings?.value?.intervalSeconds ?? 6}
        autoplay={settings?.value?.autoplay !== false}
      />
    );
  } else if (module === "branding") {
    const [{ vehicles, models, brands }, campaigns, media] = await Promise.all([
      vehicleCatalog(),
      allRows<any>("campaigns"),
      allRows<any>("site_media"),
    ]);
    const slots = [
      { slot: "hero", label: "Hero fallback photo (when slideshow is empty)" },
      { slot: "logo", label: "Store logo" },
      ...brands.flatMap((b) => [
        { slot: `brand-${b.slug}-photo`, label: b.name + " card photo" },
        { slot: `brand-${b.slug}-logo`, label: b.name + " logo" },
      ]),

      ...campaigns.map((c) => ({
        slot: "campaign-" + c.id,
        label: "Campaign · " + c.title.en,
      })),
    ];
    const initial = Object.fromEntries(
      await Promise.all(
        media.map(async (row) => {
          const { data } = await db.storage
            .from("catalog-images")
            .createSignedUrl(row.path, 600);
          return [row.slot, { ...row, url: data?.signedUrl }];
        }),
      ),
    );
    content = (
      <div className="stack">
        <Link className="button secondary" href="/admin?module=hero-slideshow">
          Manage homepage slideshow
        </Link>
        <p className="notice">
          Manage car make and model pictures in{" "}
          <Link href="/admin?module=vehicles">Vehicles</Link>. Use this page for
          your store logo, homepage artwork and promotional images.
        </p>
        <BrandingMedia slots={slots} initial={initial} />
      </div>
    );
  } else if (module === "recommendations") {
    const [products, relations] = await Promise.all([
      allRows<any>("products", "id,sku,name"),
      allRows<any>("product_relations"),
    ]);
    content = <RelationsEditor products={products} initial={relations} />;
  } else if (module === "campaigns") {
    const campaigns = await allRows<any>("campaigns");
    content = (
      <div className="two-col admin-campaigns-redesign" lang="ar" dir="rtl">
        <div className="panel stack">
          <Link className="button secondary" href="/admin?module=campaigns">
            إضافة حملة جديدة
          </Link>
          {campaigns.map((c) => (
            <Link key={c.id} href={"/admin?module=campaigns&id=" + c.id}>
              {c.title.ar || c.title.en} · {c.enabled ? "مفعّلة" : "متوقفة"}
            </Link>
          ))}
          <p>
            الحملات المفعّلة بس هي اللي بتظهر في الصفحة الرئيسية خلال فترة عرضها المحددة بتوقيت UTC.
          </p>
        </div>
        <MerchantForm
          key={id}
          title="حملة تسويقية مجدولة للصفحة الرئيسية"
          action="admin-campaign"
          initial={
            campaigns.find((c) => c.id === id) ?? {
              id: crypto.randomUUID(),
              title: { ar: "", en: "" },
              body: { ar: "", en: "" },
              href: null,
              image: null,
              starts_at: new Date().toISOString(),
              ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
              enabled: false,
            }
          }
          fields={[
            ...["ar", "en"].flatMap((lang) => [
              {
                path: "title." + lang,
                label: "عنوان الحملة · " + (lang === "ar" ? "عربي" : "إنجليزي"),
                required: true,
              },
              {
                path: "body." + lang,
                label: "وصف الحملة · " + (lang === "ar" ? "عربي" : "إنجليزي"),
                type: "textarea" as const,
              },
            ]),
            {
              path: "href",
              label: "رابط داخلي (مثال: /ar/offers)",
              nullable: true,
            },
            { path: "image", label: "مسار صورة الحملة (/images/…)", nullable: true },
            {
              path: "starts_at",
              label: "تاريخ بداية الحملة (UTC)",
              type: "datetime-local",
              required: true,
            },
            {
              path: "ends_at",
              label: "تاريخ نهاية الحملة (UTC)",
              type: "datetime-local",
              required: true,
            },
            { path: "enabled", label: "تفعيل الحملة", type: "checkbox" },
          ]}
        />
      </div>
    );
  } else if (module === "shipping") {
    const [areas, { data: shippingSettings }] = await Promise.all([
      allRows<any>("shipping_areas"),
      db
        .from("site_settings")
        .select("value")
        .eq("key", "shipping")
        .maybeSingle(),
    ]);
    const selected = areas.find((a) => a.id === id);
    const governorate = selected?.governorate ?? "Cairo";
    const rates =
      selected && !selected.id.startsWith("eg-")
        ? [selected]
        : areas.filter(
            (a) => a.governorate === governorate && a.id.startsWith("eg-"),
          );
    content = (
      <div className="two-col">
        <section className="panel stack">
          <h2>Egyptian governorates · shipping rates</h2>
          <p>
            Set normal and express delivery rates for all 27 governorates.
            Normal delivery takes 2–5 business days; express delivery is within
            48 hours. Edit and enable each option below. All rates are in EGP.
          </p>
          {governorates.map((g) => {
            const options = areas.filter(
              (a) => a.governorate === g.en && a.id.startsWith("eg-"),
            );
            return (
              <Link
                key={g.code}
                href={`/admin?module=shipping&id=eg-${g.code}-standard`}
                aria-current={governorate === g.en ? "page" : undefined}
              >
                {g.en} · {g.ar}
                <br />
                {options
                  .map(
                    (a) =>
                      `${a.service_type === "express" ? "Express" : "Normal"}: ${a.amount == null ? "not configured" : money(a.amount, "en")} (${a.enabled ? "enabled" : "disabled"})`,
                  )
                  .join(" / ")}
              </Link>
            );
          })}
          <details>
            <summary>Existing local/custom delivery areas</summary>
            {areas
              .filter((a) => !a.id.startsWith("eg-"))
              .map((a) => (
                <p key={a.id}>
                  <Link href={`/admin?module=shipping&id=${a.id}`}>
                    {a.governorate} / {a.name}
                  </Link>
                </p>
              ))}
          </details>
          <FreeShippingEditor
            amount={shippingSettings?.value?.free_shipping_threshold ?? null}
          />
        </section>
        <div className="stack">
          {rates.map((rate) => (
            <ShippingRateEditor key={rate.id} initial={rate} />
          ))}
          {!rates.length && (
            <p className="panel">
              Apply the governorate shipping migration to initialize these
              options.
            </p>
          )}
        </div>
      </div>
    );
  } else if (module === "cms") {
    const { data, error } = await db
      .from("cms_pages")
      .select("*")
      .order("slug");
    if (error) throw error;
    content = (
      <div className="two-col">
        <div className="panel stack">
          <Link className="button secondary" href="/admin?module=cms">
            Create a new page
          </Link>
          {data?.map((p) => (
            <Link key={p.slug} href={`/admin?module=cms&id=${p.slug}`}>
              {p.slug} · {p.published ? "Published" : "Draft"}
            </Link>
          ))}
          <p>
            Use policies/privacy, policies/terms, policies/shipping,
            policies/returns, policies/warranty, about, contact, faq, guides.
            Shipping, returns and warranty drafts need review of delivery
            estimates, support contacts and supplier coverage before marking
            them published.
          </p>
        </div>
        <MerchantForm
          key={id}
          title="Bilingual CMS page"
          action="admin-cms"
          fields={[
            {
              path: "slug",
              label:
                "Page path (about, faq, guides/article, policies/returns…)",
              required: true,
            },
            ...["ar", "en"].flatMap((lang) => [
              {
                path: "title." + lang,
                label: "Title · " + lang,
                required: true,
              },
              {
                path: "body." + lang,
                label: "Content · " + lang,
                type: "textarea" as const,
              },
              { path: "seo.title." + lang, label: "SEO title · " + lang },
              {
                path: "seo.description." + lang,
                label: "SEO description · " + lang,
                type: "textarea" as const,
              },
            ]),
            {
              path: "published",
              label: "Published (merchant approved)",
              type: "checkbox",
            },
          ]}
          initial={
            data?.find((p) => p.slug === id) ?? {
              slug: id ?? "",
              title: { en: "", ar: "" },
              body: { en: "", ar: "" },
              published: false,
            }
          }
        />
      </div>
    );
  } else if (module === "orders") {
    const allowedOrderStatuses = ["pending_confirmation", "confirmed", "processing", "shipped", "delivered", "cancelled", "returned"];
    let orderQuery = db.from("orders").select("id,order_number,customer,status,payment_status,payment_method,total,subtotal,discount,shipping_amount,shipping,carrier,tracking_number,staff_notes,demo,created_at,order_items(snapshot,quantity)");
    if (!id && status && allowedOrderStatuses.includes(status)) orderQuery = orderQuery.eq("status", status);
    const { data, error } = await orderQuery
      .order("created_at", { ascending: false })
      .match(id ? { id } : {})
      .limit(100);
    if (error) throw error;
    const orderIds = data?.map((o) => o.id) ?? [];
    const { data: transfers, error: transferError } = orderIds.length
      ? await db
          .from("manual_transfers")
          .select(
            "id,order_id,method,reference,amount,status,proof_path,created_at",
          )
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
      : { data: [], error: null };
    if (transferError) throw transferError;
    const { data: statusHistory, error: statusHistoryError } = id
      ? await db.from("order_status_events").select("id,order_id,status,created_at,note").eq("order_id", id).order("created_at", { ascending: false }).limit(50)
      : { data: [], error: null };
    if (statusHistoryError) throw statusHistoryError;
    content = (
      <div className="stack">
        {!data?.length && (
          <section className="panel admin-empty">
            <h2>{id ? "Order not found" : "No orders yet"}</h2>
            <p>
              {id
                ? "This order could not be found. Return to the order list to continue."
                : "New customer orders will appear here with payment and delivery details."}
            </p>
            {id && (
              <Link className="button secondary" href="/admin?module=orders">
                View all orders
              </Link>
            )}
          </section>
        )}
        {!id && (
          <section className="panel admin-orders-list" lang="ar" dir="rtl">
            <div className="admin-orders-list-head"><div><h2>قائمة الطلبات</h2><p>ابحث وتابع الطلبات، وافتح أي طلب لتعديل بياناته أو مراجعة الدفع.</p></div><strong>{data?.length ?? 0} طلب في النتائج</strong></div>
            <form method="get" action="/admin" className="admin-orders-filters">
              <input type="hidden" name="module" value="orders" />
              <label>بحث في النتائج<input type="search" name="q" defaultValue={q ?? ""} placeholder="رقم الطلب أو اسم العميل أو الهاتف" /></label>
              <label>حالة الطلب<select name="status" defaultValue={status ?? ""}><option value="">كل الحالات</option>{allowedOrderStatuses.map((v) => <option key={v} value={v}>{humanStatus(v, orderStatusLabels)}</option>)}</select></label>
              <button type="submit">تطبيق الفلاتر</button>
            </form>
            <p className="admin-orders-hint">البحث النصي داخل أحدث 100 طلب في الحالة المحددة؛ استخدم فلتر الحالة لتضييق النتائج.</p>
            <div className="admin-orders-rows">
              {data?.filter((o) => !q || [o.order_number, o.customer?.name, o.customer?.phone].some((v) => String(v ?? "").toLowerCase().includes(q.trim().toLowerCase()))).map((o) => (
                <Link className="admin-order-row" href={`/admin?module=orders&id=${o.id}`} key={o.id}>
                  <span className="admin-order-row-primary"><strong>#{o.order_number}</strong><small>{o.customer?.name ?? "عميل"}</small></span>
                  <span className="admin-order-status">{humanStatus(o.status, orderStatusLabels)}</span>
                  <span className="admin-order-payment">{humanStatus(o.payment_status, paymentStatusLabels)}</span>
                  <strong className="admin-order-total">{money(o.total, "ar")}</strong>
                  <span className="admin-order-open">عرض التفاصيل ←</span>
                </Link>
              ))}
            </div>
          </section>
        )}
        {id && data?.map((o) => (
          <article key={o.id} className="panel admin-order-detail" lang="ar" dir="rtl">
            <div className="admin-order-detail-header">
              <div>
                <Link href="/admin?module=orders" className="admin-order-back">← كل الطلبات</Link>
                <h2>تفاصيل الطلب #{o.order_number}</h2>
                <time dateTime={o.created_at}>{new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(o.created_at))} · بتوقيت القاهرة</time>
              </div>
              <span className="admin-order-status">{humanStatus(o.status, orderStatusLabels)}</span>
            </div>
            <div className="admin-order-detail-grid">
              <div className="admin-order-detail-main">
                <section className="admin-order-detail-card">
                  <h3>بيانات العميل</h3>
                  <p><strong>الاسم:</strong> {o.customer.name}</p>
                  <p><strong>الهاتف:</strong> <a href={`tel:${o.customer.phone}`}>{o.customer.phone}</a></p>
                  <p><strong>العنوان:</strong> {o.customer.address}</p>
                  {o.customer.delivery_notes && <p><strong>ملاحظات التوصيل:</strong> {o.customer.delivery_notes}</p>}
                </section>
                <section className="admin-order-detail-card">
                  <h3>المنتجات المطلوبة</h3>
                  {o.order_items?.map((item: any, i: number) => (
                    <div className="admin-order-item" key={i}>
                      <div><strong>{item.snapshot.name.ar || item.snapshot.name.en}</strong><small>{item.snapshot.sku}</small></div>
                      <span>الكمية: {item.quantity}</span>
                      <strong>{money(item.snapshot.price * item.quantity, "ar")}</strong>
                    </div>
                  ))}
                </section>
                <section className="admin-order-detail-card">
                  <h3>الشحن والتوصيل</h3>
                  <p>{o.shipping.governorate} / {o.shipping.name}</p>
                  <p><strong>تكلفة التوصيل:</strong> {money(o.shipping_amount, "ar")}</p>
                  <p><strong>شركة الشحن:</strong> {o.carrier || "لم تحدد بعد"}</p>
                  <p><strong>رقم التتبع:</strong> {o.tracking_number || "لم يحدد بعد"}</p>
                </section>
              </div>
              <div className="admin-order-detail-side">
                <section className="admin-order-detail-card">
                  <h3>ملخص الدفع</h3>
                  <p><strong>الحالة:</strong> {humanStatus(o.payment_status, paymentStatusLabels)}</p>
                  <p><strong>الطريقة:</strong> {o.payment_method || "غير محددة"}</p>
                  <p><strong>قيمة المنتجات:</strong> {money(o.subtotal, "ar")}</p>
                  <p><strong>الخصم:</strong> {money(o.discount, "ar")}</p>
                  <p><strong>الشحن:</strong> {money(o.shipping_amount, "ar")}</p>
                  <div className="admin-order-grand-total"><strong>الإجمالي</strong><strong>{money(o.total, "ar")}</strong></div>
                </section>
                <section className="admin-order-detail-card">
                  <h3>التحويلات ومراجعة الدفع</h3>
            {transfers
              ?.filter((transfer) => transfer.order_id === o.id)
              .map((transfer) => (
                <div key={transfer.id} className="notice stack">
                  <p>
                    Transfer: {transfer.method} · {transfer.status} ·{" "}
                    {money(transfer.amount, "en")}
                    {transfer.reference ? ` · ${transfer.reference}` : ""}
                  </p>
                  {transfer.proof_path && (
                    <a
                      href={`/api/payment-proof?id=${transfer.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View transfer receipt ↗
                    </a>
                  )}
                  {transfer.status === "pending" && (
                    <div className="two-col">
                      <ApiForm
                        action="admin-verify-transfer"
                        extra={{ id: transfer.id, status: "verified" }}
                        label="Approve payment"
                      />
                      <ApiForm
                        action="admin-verify-transfer"
                        extra={{ id: transfer.id, status: "rejected" }}
                        label="Reject payment"
                      />
                    </div>
                  )}
                </div>
              ))}
                </section>
                <section className="admin-order-detail-card">
                  <h3>سجل حالات الطلب</h3>
                  {statusHistory?.length ? (
                    <ol className="admin-order-timeline">
                      {statusHistory.map((event) => (
                        <li key={event.id}>
                          <strong>{humanStatus(event.status, orderStatusLabels)}</strong>
                          <time dateTime={event.created_at}>{new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Cairo" }).format(new Date(event.created_at))}</time>
                          {event.note && <p>{event.note}</p>}
                        </li>
                      ))}
                    </ol>
                  ) : <p>لا توجد تغييرات مسجلة لحالة الطلب حتى الآن.</p>}
                </section>
                <section className="admin-order-detail-card">
                  <h3>تحديث الطلب والشحن</h3>
                  <p className="admin-order-transition-hint">القائمة تعرض الحالة الحالية والانتقالات المسموح بها فقط. قاعدة البيانات تتحقق من صحة أي انتقال قبل حفظه.</p>
            <ApiForm
              action="admin-order"
              extra={{ id: o.id }}
              label="Update order status"
            >
              <label>
                Carrier
                <input
                  name="carrier"
                  maxLength={100}
                  defaultValue={o.carrier ?? ""}
                />
              </label>
              <label>
                Tracking number
                <input
                  name="tracking_number"
                  maxLength={150}
                  defaultValue={o.tracking_number ?? ""}
                />
              </label>
              <label>
                Private staff notes
                <textarea
                  name="staff_notes"
                  maxLength={5000}
                  defaultValue={o.staff_notes ?? ""}
                />
              </label>
              <label>
                Status
                <select name="status" defaultValue={o.status}>
                  {[o.status, ...(allowedNextOrderStatuses[o.status] ?? [])].map((s) => (
                    <option key={s} value={s}>{humanStatus(s, orderStatusLabels)}</option>
                  ))}
                </select>
              </label>
            </ApiForm>
                </section>
            {o.status === "delivered" &&
              o.payment_status !== "paid" &&
              (o.payment_method ?? "cod") === "cod" && (
                <ApiForm
                  action="admin-collect-cod"
                  extra={{ id: o.id }}
                  label="Confirm COD collection"
                />
              )}
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  } else if (module === "messages") {
    const messageStatuses = ["new", "read", "replied", "closed"];
    const selectedMessageStatus = !id && status && messageStatuses.includes(status) ? status : "";
    const messageQuery = db.from("contact_messages").select("*").match(id ? { id } : {});
    const { data, error } = await (selectedMessageStatus ? messageQuery.eq("status", selectedMessageStatus) : messageQuery)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    content = (
      <div className="stack admin-customer-inbox" lang="ar" dir="rtl">
        {!id && (
          <form className="panel filters" method="get">
            <input type="hidden" name="module" value="messages" />
            <label>فلترة حسب الحالة
              <select name="status" defaultValue={selectedMessageStatus}>
                <option value="">كل الرسائل</option>
                {messageStatuses.map((s) => <option key={s} value={s}>{({ new: "جديدة", read: "مقروءة", replied: "تم الرد", closed: "مغلقة" } as Record<string, string>)[s]}</option>)}
              </select>
            </label>
            <button className="button">تطبيق الفلتر</button>
          </form>
        )}
        {!data?.length && (
          <section className="panel admin-empty">
            <h2>{id ? "الرسالة مش موجودة" : selectedMessageStatus ? "مفيش رسائل بالحالة دي" : "مفيش رسائل لسه"}</h2>
            <p>هنا هتظهر رسائل العملاء اللي بعتوها من الموقع.</p>
            {id && (
              <Link className="button secondary" href="/admin?module=messages">
                عرض كل الرسائل
              </Link>
            )}
          </section>
        )}
        {data?.map((m) => (
          <article key={m.id} className="panel stack">
            <div>
              <h2>{m.name}</h2>
              <p>
                <time dateTime={m.created_at}>
                  {new Intl.DateTimeFormat("ar-EG", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Cairo",
                  }).format(new Date(m.created_at))}
                </time>{" "}
                · بتوقيت القاهرة · {({ new: "جديدة", read: "مقروءة", replied: "تم الرد", closed: "مغلقة" } as Record<string, string>)[m.status] ?? m.status}
              </p>
            </div>
            <p>
              <a href={`tel:${m.phone}`}>{m.phone}</a>
              {" · "}
              <a href={`mailto:${m.email}`}>{m.email}</a>
            </p>
            <p className="prose">{m.body}</p>
            <ApiForm
              action="admin-message"
              extra={{ id: m.id }}
              label="حفظ حالة الرسالة"
            >
              <label>
                حالة الرسالة
                <select name="status" defaultValue={m.status}>
                  {["new", "read", "replied", "closed"].map((s) => (
                    <option key={s} value={s}>{({ new: "جديدة", read: "مقروءة", replied: "تم الرد", closed: "مغلقة", pending: "قيد المراجعة", quoted: "تم عرض السعر", resolved: "تم الحل" } as Record<string, string>)[s] ?? s}</option>
                  ))}
                </select>
              </label>
            </ApiForm>
          </article>
        ))}
      </div>
    );
  } else if (module === "inquiries") {
    const inquiryStatuses = ["pending", "quoted", "resolved", "closed"];
    const selectedInquiryStatus = !id && status && inquiryStatuses.includes(status) ? status : "";
    const inquiryQuery = db.from("part_requests").select("*").match(id ? { id } : {});
    const { data, error } = await (selectedInquiryStatus ? inquiryQuery.eq("status", selectedInquiryStatus) : inquiryQuery)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    content = (
      <div className="stack admin-customer-inbox" lang="ar" dir="rtl">
        {!id && (
          <form className="panel filters" method="get">
            <input type="hidden" name="module" value="inquiries" />
            <label>فلترة حسب الحالة
              <select name="status" defaultValue={selectedInquiryStatus}>
                <option value="">كل الطلبات</option>
                {inquiryStatuses.map((s) => <option key={s} value={s}>{({ pending: "قيد المراجعة", quoted: "تم عرض السعر", resolved: "تم الحل", closed: "مغلق" } as Record<string, string>)[s]}</option>)}
              </select>
            </label>
            <button className="button">تطبيق الفلتر</button>
          </form>
        )}
        {!data?.length && (
          <section className="panel admin-empty">
            <h2>{id ? "الطلب مش موجود" : selectedInquiryStatus ? "مفيش طلبات بالحالة دي" : "مفيش طلبات استفسار لسه"}</h2>
            <p>هنا هتظهر طلبات التواصل والاستفسارات عن قطع الغيار.</p>
            {id && (
              <Link className="button secondary" href="/admin?module=inquiries">
                عرض كل الطلبات
              </Link>
            )}
          </section>
        )}
        {data?.map((r) => (
          <article key={r.id} className="panel">
            <h2>{r.contact}</h2>
            <p>
              <time dateTime={r.created_at}>
                {new Intl.DateTimeFormat("ar-EG", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Africa/Cairo",
                }).format(new Date(r.created_at))}
              </time>{" "}
              · بتوقيت القاهرة
            </p>
            <p>{r.description}</p>
            <p>
              {r.vehicle_details?.request_type === "contact"
                ? `طلب تواصل · ${r.vehicle_details.topic}`
                : (r.vehicle_config_id ??
                  Object.values(r.vehicle_details ?? {}).join(" · "))}
            </p>
            {!r.vehicle_config_id &&
              r.vehicle_details?.request_type !== "contact" && (
                <p className="notice">
                  العميل كتب بيانات العربية بنفسه؛ لازم نراجع التوافق يدويًا قبل تأكيد القطعة.
                </p>
              )}
            {r.image_path && (
              <a
                href={`/api/inquiry-image?id=${r.id}`}
                target="_blank"
                rel="noreferrer"
              >
                عرض صورة الطلب الخاصة ↗
              </a>
            )}
            <ApiForm
              action="admin-inquiry"
              extra={{ id: r.id }}
              label="حفظ بيانات الطلب"
            >
              <label>
                السعر المعروض · جنيه مصري
                <input
                  name="quoted_amount_egp"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={
                    r.quoted_amount == null ? "" : r.quoted_amount / 100
                  }
                />
              </label>
              <label>
                ملاحظات داخلية للفريق
                <textarea
                  name="staff_notes"
                  maxLength={5000}
                  defaultValue={r.staff_notes ?? ""}
                />
              </label>
              <label>
                حالة الطلب
                <select name="status" defaultValue={r.status}>
                  {inquiryStatuses.map((s) => (
                    <option key={s} value={s}>{({ pending: "قيد المراجعة", quoted: "تم عرض السعر", resolved: "تم الحل", closed: "مغلق" } as Record<string, string>)[s]}</option>
                  ))}
                </select>
              </label>
            </ApiForm>
          </article>
        ))}
      </div>
    );
  } else if (module === "vehicles") {
    const [models, configs, generations, modelYears, { brands }] =
      await Promise.all([
        allRows<any>("vehicle_models"),
        allRows<any>("vehicle_configs"),
        allRows<any>("vehicle_generations"),
        allRows<any>("vehicle_model_years"),
        vehicleCatalog(),
      ]);
    const media = await siteMedia([
      ...brands.map((b) => `brand-${b.slug}-photo`),
      ...models.map((m) => `model-${m.brand}-${m.slug}`),
    ]);
    content = (
      <AdminVehicles
        media={media}
        brands={brands}
        modelYears={modelYears}
        models={models}
        configs={configs}
        generations={generations}
        initialId={id}
      />
    );
  } else if (module === "promotions") {
    const coupons = await allRows<any>("coupons");
    content = (
      <div className="two-col">
        <section className="panel stack">
          <h2>Coupons</h2>
          <Link className="button secondary" href="/admin?module=promotions">
            New coupon
          </Link>
          {coupons.map((c) => (
            <Link key={c.code} href={"/admin?module=promotions&id=" + c.code}>
              {c.code} · {c.redemptions} / {c.max_redemptions} uses
            </Link>
          ))}
          <p>
            One coupon per order. Edit sale prices on the product itself. New
            coupons apply to all products.
          </p>
        </section>
        <AdminCoupon
          key={id ?? "new"}
          initial={
            coupons.find((c) => c.code === id) ?? {
              code: "",
              kind: "percentage",
              amount: 10,
              starts_at: new Date().toISOString(),
              ends_at: new Date(Date.now() + 86400000 * 30).toISOString(),
              max_redemptions: 10,
              per_customer_limit: 1,
              scope_category: null,
            }
          }
        />
      </div>
    );
  } else if (module === "settings") {
    const { data: currentSettings, error: settingsError } = await db
      .from("site_settings")
      .select("value")
      .eq("key", "storefront")
      .maybeSingle();
    if (settingsError) throw settingsError;
    content = (
      <div className="stack admin-settings-redesign" lang="ar" dir="rtl">
        <AdminCheckoutReadiness />
        <MerchantForm
          title="اسم المتجر ومحتوى الصفحة الرئيسية"
          action="admin-settings"
          initial={{
            heroImage: "/images/cyan/hero-blue.webp",
            heroTitle: {
              ar: "قطع غيار عربيتك…\nمن غير تدوير.",
              en: "The right parts for your car…\nWithout the runaround.",
            },
            heroIntro: {
              ar: "اختار عربيتك، واعرف قطع الغيار المناسبة ليها، وقارن الأسعار واطلب بكل سهولة.",
              en: "Choose your car, find the parts that fit, compare prices and order with confidence.",
            },
            storeName: { ar: "MOPC", en: "MOPC" },
            ...currentSettings?.value,
          }}
          fields={[
            {
              path: "heroImage",
              label: "مسار الصورة الافتراضية (صور البانر المرفوعة ليها الأولوية)",
              required: true,
            },
            ...["ar", "en"].flatMap((lang) => [
              {
                path: "storeName." + lang,
                label: "اسم المتجر · " + (lang === "ar" ? "عربي" : "إنجليزي"),
                required: true,
              },
              {
                path: "heroTitle." + lang,
                label: "عنوان الواجهة · " + (lang === "ar" ? "عربي" : "إنجليزي") + " (السطر الجديد بيظهر بشكل مميز)",
                type: "textarea" as const,
                required: true,
              },
              {
                path: "heroIntro." + lang,
                label: "وصف الواجهة · " + (lang === "ar" ? "عربي" : "إنجليزي"),
                type: "textarea" as const,
              },
            ]),
          ]}
        />

        <section className="panel stack">
          <h2>حالة وسائل الدفع</h2>
          <p>
            الدفع عند الاستلام:{" "}
            {process.env.COD_ENABLED === "true" ? "متاح" : "غير مفعّل"}
          </p>
          <p>
            البطاقات والتقسيط عبر EasyKash:{" "}
            {process.env.EASYKASH_API_KEY ? "تم إعداد الربط" : "الربط غير مُعدّ"}
          </p>
          <p>
            التحويلات عبر InstaPay والمحافظ الإلكترونية: متاحة مع مراجعة الدفع يدويًا
          </p>
          <p className="muted">
            حالة وسائل الدفع is controlled in the hosting settings. Uploaded
            homepage photos are managed in{" "}
            <Link href="/admin?module=hero-slideshow">بانرات الواجهة</Link> and{" "}
            <Link href="/admin?module=branding">الهوية البصرية</Link>.
          </p>
          <details>
            <summary>إعدادات التشغيل التقنية</summary>
            <p>
              أرشفة محركات البحث:{" "}
              {process.env.STORE_LAUNCH_APPROVED === "true"
                ? "مفعّلة"
                : "متوقفة"}
              . التحليلات:{" "}
              {process.env.ANALYTICS_ENABLED === "true"
                ? "مفعّلة"
                : "متوقفة"}
              .
            </p>
            <p>
              المنتجات التجريبية مستبعدة من إتمام الطلبات على الإنتاج. مفاتيح مزودي الدفع بتتدار في بيئة النشر ومش بتظهر هنا.
            </p>
          </details>
        </section>
      </div>
    );
  } else redirect("/admin");
  return (
    <AdminWorkspace module={module} email={admin.email ?? "Administrator"}>
      {content}
    </AdminWorkspace>
  );
}
