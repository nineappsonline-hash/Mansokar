import { AdminCheckoutReadiness } from "@/components/admin-checkout-readiness";
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
  if (module === "overview" || module === "reports") {
    content = (
      <div className="stack">
        {module === "overview" && <AdminCheckoutReadiness />}
        <AdminReports module={module} from={from} to={to} />
      </div>
    );
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
      <div className="two-col">
        <div className="panel stack">
          <Link className="button secondary" href="/admin?module=campaigns">
            New campaign
          </Link>
          {campaigns.map((c) => (
            <Link key={c.id} href={"/admin?module=campaigns&id=" + c.id}>
              {c.title.en} · {c.enabled ? "Enabled" : "Disabled"}
            </Link>
          ))}
          <p>
            Only enabled campaigns within their scheduled UTC dates appear on
            the homepage.
          </p>
        </div>
        <MerchantForm
          key={id}
          title="Scheduled homepage campaign"
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
                label: "Title · " + lang,
                required: true,
              },
              {
                path: "body." + lang,
                label: "Body · " + lang,
                type: "textarea" as const,
              },
            ]),
            {
              path: "href",
              label: "Internal link (/ar/offers or /en/offers)",
              nullable: true,
            },
            { path: "image", label: "Image path (/images/…)", nullable: true },
            {
              path: "starts_at",
              label: "Starts (UTC)",
              type: "datetime-local",
              required: true,
            },
            {
              path: "ends_at",
              label: "Ends (UTC)",
              type: "datetime-local",
              required: true,
            },
            { path: "enabled", label: "Enabled", type: "checkbox" },
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
    let orderQuery = db.from("orders");
    const { data, error } = await orderQuery
      .select(
        "id,order_number,customer,status,payment_status,payment_method,total,subtotal,discount,shipping_amount,shipping,carrier,tracking_number,staff_notes,demo,created_at,order_items(snapshot,quantity)",
      )
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
        {data?.map((o) => (
          <article key={o.id} className="panel">
            <h2>Order {o.order_number}</h2>
            <p>
              <time dateTime={o.created_at}>
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Africa/Cairo",
                }).format(new Date(o.created_at))}
              </time>{" "}
              · Cairo time
            </p>
            <p>
              {o.order_number} · {o.demo ? "DEMO" : ""} · {o.status} ·{" "}
              {o.payment_status} · {o.payment_method ?? "Not specified"} ·{" "}
              {money(o.total, "en")}
            </p>
            <p>
              {o.customer.name} · {o.customer.phone} · {o.customer.address}
            </p>
            <p>
              {o.shipping.governorate} / {o.shipping.name} · Delivery{" "}
              {money(o.shipping_amount, "en")} · Discount{" "}
              {money(o.discount, "en")}
            </p>
            <p>{o.customer.delivery_notes}</p>
            {o.order_items?.map((item: any, i: number) => (
              <p key={i}>
                {item.snapshot.sku} · {item.snapshot.name.en} × {item.quantity}{" "}
                · {money(item.snapshot.price * item.quantity, "en")}
              </p>
            ))}
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
                  {[
                    "pending_confirmation",
                    "confirmed",
                    "processing",
                    "shipped",
                    "delivered",
                    "cancelled",
                    "returned",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </ApiForm>
            {o.status === "delivered" &&
              o.payment_status !== "paid" &&
              (o.payment_method ?? "cod") === "cod" && (
                <ApiForm
                  action="admin-collect-cod"
                  extra={{ id: o.id }}
                  label="Confirm COD collection"
                />
              )}
          </article>
        ))}
      </div>
    );
  } else if (module === "messages") {
    const { data, error } = await db
      .from("contact_messages")
      .select("*")
      .match(id ? { id } : {})
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    content = (
      <div className="stack">
        {!data?.length && (
          <section className="panel admin-empty">
            <h2>{id ? "Message not found" : "No messages yet"}</h2>
            <p>Messages sent through the storefront chat appear here.</p>
            {id && (
              <Link className="button secondary" href="/admin?module=messages">
                View all messages
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
                  {new Intl.DateTimeFormat("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Africa/Cairo",
                  }).format(new Date(m.created_at))}
                </time>{" "}
                · Cairo time · {m.status}
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
              label="Update message"
            >
              <label>
                Message status
                <select name="status" defaultValue={m.status}>
                  {["new", "read", "replied", "closed"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </ApiForm>
          </article>
        ))}
      </div>
    );
  } else if (module === "inquiries") {
    const { data, error } = await db
      .from("part_requests")
      .select("*")
      .match(id ? { id } : {})
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    content = (
      <div className="stack">
        {!data?.length && (
          <section className="panel admin-empty">
            <h2>{id ? "Inquiry not found" : "No inquiries yet"}</h2>
            <p>Customer callbacks and spare-part requests appear here.</p>
            {id && (
              <Link className="button secondary" href="/admin?module=inquiries">
                View all inquiries
              </Link>
            )}
          </section>
        )}
        {data?.map((r) => (
          <article key={r.id} className="panel">
            <h2>{r.contact}</h2>
            <p>
              <time dateTime={r.created_at}>
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Africa/Cairo",
                }).format(new Date(r.created_at))}
              </time>{" "}
              · Cairo time
            </p>
            <p>{r.description}</p>
            <p>
              {r.vehicle_details?.request_type === "contact"
                ? `Callback request · ${r.vehicle_details.topic}`
                : (r.vehicle_config_id ??
                  Object.values(r.vehicle_details ?? {}).join(" · "))}
            </p>
            {!r.vehicle_config_id &&
              r.vehicle_details?.request_type !== "contact" && (
                <p className="notice">
                  Customer-described vehicle; exact fitment requires manual
                  verification.
                </p>
              )}
            {r.image_path && (
              <a
                href={`/api/inquiry-image?id=${r.id}`}
                target="_blank"
                rel="noreferrer"
              >
                View private inquiry photo ↗
              </a>
            )}
            <ApiForm
              action="admin-inquiry"
              extra={{ id: r.id }}
              label="Update inquiry"
            >
              <label>
                Quoted amount · EGP (whole pounds)
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
                Private staff notes
                <textarea
                  name="staff_notes"
                  maxLength={5000}
                  defaultValue={r.staff_notes ?? ""}
                />
              </label>
              <label>
                Inquiry status
                <select name="status" defaultValue={r.status}>
                  {["pending", "quoted", "resolved", "closed"].map((s) => (
                    <option key={s}>{s}</option>
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
      <div className="stack">
        <AdminCheckoutReadiness />
        <MerchantForm
          title="Store name & homepage"
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
              label: "Fallback image path (uploaded hero photos take priority)",
              required: true,
            },
            ...["ar", "en"].flatMap((lang) => [
              {
                path: "storeName." + lang,
                label: "Store name · " + lang,
                required: true,
              },
              {
                path: "heroTitle." + lang,
                label: "Hero heading · " + lang + " (new line = accent text)",
                type: "textarea" as const,
                required: true,
              },
              {
                path: "heroIntro." + lang,
                label: "Hero introduction · " + lang,
                type: "textarea" as const,
              },
            ]),
          ]}
        />

        <section className="panel stack">
          <h2>Payment availability</h2>
          <p>
            Cash on delivery:{" "}
            {process.env.COD_ENABLED === "true" ? "Available" : "Disabled"}
          </p>
          <p>
            Cards and installments via EasyKash:{" "}
            {process.env.EASYKASH_API_KEY ? "Configured" : "Not configured"}
          </p>
          <p>
            InstaPay and e-wallet transfers: Available with manual payment
            review
          </p>
          <p className="muted">
            Payment availability is controlled in the hosting settings. Uploaded
            homepage photos are managed in{" "}
            <Link href="/admin?module=hero-slideshow">Hero slideshow</Link> and{" "}
            <Link href="/admin?module=branding">Branding</Link>.
          </p>
          <details>
            <summary>Technical launch settings</summary>
            <p>
              Search indexing:{" "}
              {process.env.STORE_LAUNCH_APPROVED === "true"
                ? "Enabled"
                : "Disabled"}
              . Analytics:{" "}
              {process.env.ANALYTICS_ENABLED === "true"
                ? "Enabled"
                : "Disabled"}
              .
            </p>
            <p>
              Production checkout excludes demonstration products. Provider
              credentials are managed in the deployment environment.
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
