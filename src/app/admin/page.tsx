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
} from "@/lib/db";
import { AuthForm, ApiForm } from "@/components/forms";
import {
  JsonEditor,
  Importer,
  ImageUpload,
  ImageManager,
  BrandingMedia,
  ProductEditor,
  FitmentEditor,
  MerchantForm,
  RelationsEditor,
} from "@/components/admin-editor";
import { demoProducts, money } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Administration",
  robots: { index: false, follow: false },
};
const modules = [
  "overview",
  "products",
  "images",
  "recommendations",
  "campaigns",
  "customers",
  "taxonomy",
  "fitments",
  "vehicles",
  "orders",
  "inquiries",
  "shipping",
  "promotions",
  "cms",
  "import",
  "reports",
  "analytics",
  "settings",
  "branding",
  "hero-slideshow",
];
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
  }>;
}) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    return (
      <main className="shell section">
        <Link className="logo" href="/en">
          Drive<span>Parts</span>
        </Link>
        <h1>Administrator access</h1>
        <p className="notice">
          A verified account on the server-managed administrator allowlist is
          required. There is no demo admin bypass.
        </p>
        <AuthForm locale="en" configured={configured()} />
      </main>
    );
  }
  const { module = "overview", id, from, to, q, page } = await searchParams;
  const db = service();
  let content: React.ReactNode;
  if (module === "overview" || module === "reports") {
    content = <AdminReports module={module} from={from} to={to} />;
  } else if (module === "analytics") {
    const { data } = await db
      .from("analytics_events")
      .select("event,amount")
      .limit(1000);
    const counts = (data ?? []).reduce((acc: Record<string, number>, row) => {
      acc[row.event] = (acc[row.event] ?? 0) + 1;
      return acc;
    }, {});
    content = (
      <div className="panel">
        <h2>First-party anonymous event counts</h2>
        <p>
          Enabled: {process.env.ANALYTICS_ENABLED === "true" ? "Yes" : "No"}.
          Consent required; no contact details, search queries or browser
          purchase events accepted. Latest 1000 records.
        </p>
        <pre className="code-editor">{JSON.stringify(counts, null, 2)}</pre>
      </div>
    );
  } else if (module === "products") {
    const products = await allRows<any>("products");
    const [manufacturers, categories] = await Promise.all([
      allRows<any>("manufacturers"),
      allRows<any>("categories"),
    ]);
    content = (
      <div className="two-col">
        <div className="panel stack">
          <h2>Products</h2>
          {products.map((p) => (
            <Link key={p.id} href={`/admin?module=products&id=${p.id}`}>
              {p.sku} · {p.name.en} · {p.status}
            </Link>
          ))}
          <Link className="button secondary" href="/admin?module=products">
            New product
          </Link>
          <p className="muted">
            Manufacturers and categories must exist before assigning a product.
            Slugs and SKUs are unique.
          </p>
        </div>
        <ProductEditor
          key={id}
          manufacturers={manufacturers.map((m) => m.name)}
          categories={categories}
          initial={
            products.find((p) => p.id === id) ?? {
              ...demoProducts[0],
              id: undefined,
              sku: "NEW-SKU",
              slug: "new-product",
              status: "draft",
              orderable: false,
            }
          }
        />
      </div>
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
      ...models.map((m) => ({
        slot: `model-${m.brand}-${m.slug}`,
        label: `Model photo · ${m.name.en}`,
      })),
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
  } else if (module === "images") {
    const products = await allRows<any>("products", "id,sku,name");
    const selected = products.some((p) => p.id === id)
      ? id
      : (products[0]?.id ?? "");
    const { data: images, error } = await db
      .from("product_images")
      .select("path,alt,position")
      .eq("product_id", selected)
      .order("position");
    if (error) throw error;
    const initial = await Promise.all(
      (images ?? []).map(async (image) => {
        const { data, error } = await db.storage
          .from("catalog-images")
          .createSignedUrl(image.path, 600);
        if (error) throw error;
        return { ...image, url: data.signedUrl };
      }),
    );
    content = (
      <ImageManager
        key={selected}
        products={products}
        product={selected}
        initial={initial}
      />
    );
  } else if (module === "fitments") {
    const [products, fitments, { vehicles }] = await Promise.all([
      allRows<any>("products", "id,sku"),
      allRows<any>("product_fitments"),
      vehicleCatalog(),
    ]);
    content = (
      <FitmentEditor
        products={products}
        fitments={fitments}
        vehicles={vehicles}
      />
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
    content = (
      <div className="two-col">
        <section className="panel stack">
          <h2>Delivery areas</h2>
          <Link className="button secondary" href="/admin?module=shipping">
            New delivery area
          </Link>
          {areas.map((a) => (
            <Link key={a.id} href={"/admin?module=shipping&id=" + a.id}>
              {a.governorate} / {a.name} · {a.enabled ? "Enabled" : "Disabled"}
            </Link>
          ))}
          <MerchantForm
            title="Free delivery threshold"
            action="admin-free-shipping"
            initial={{
              free_shipping_threshold:
                shippingSettings?.value?.free_shipping_threshold ?? null,
            }}
            fields={[
              {
                path: "free_shipping_threshold",
                label: "Threshold · piasters (blank disables)",
                type: "number",
                nullable: true,
              },
            ]}
          />
        </section>
        <MerchantForm
          key={id}
          title="Delivery area and approved rate"
          action="admin-shipping"
          initial={
            areas.find((a) => a.id === id) ?? {
              id: "",
              governorate: "",
              name: "",
              amount: 0,
              enabled: false,
              starts_at: new Date().toISOString(),
              ends_at: null,
            }
          }
          fields={[
            { path: "id", label: "Area identifier", required: true },
            { path: "governorate", label: "Governorate", required: true },
            { path: "name", label: "Area name", required: true },
            {
              path: "amount",
              label: "Approved delivery rate · piasters",
              type: "number",
              required: true,
            },
            {
              path: "starts_at",
              label: "Effective from (UTC)",
              type: "datetime-local",
              required: true,
            },
            {
              path: "ends_at",
              label: "Effective until (UTC, blank for ongoing)",
              type: "datetime-local",
            },
            {
              path: "enabled",
              label: "Enable approved delivery area",
              type: "checkbox",
            },
          ]}
        />
      </div>
    );
  } else if (module === "cms") {
    const { data } = await db.from("cms_pages").select("*");
    content = (
      <div className="two-col">
        <div className="panel stack">
          {data?.map((p) => (
            <Link key={p.slug} href={`/admin?module=cms&id=${p.slug}`}>
              {p.slug} · {p.published ? "Published" : "Draft"}
            </Link>
          ))}
          <p>
            Use policies/privacy, policies/terms, policies/shipping,
            policies/returns, about, contact, faq, guides.
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
              slug: "about",
              title: { en: "About", ar: "من نحن" },
              body: { en: "", ar: "" },
              published: false,
            }
          }
        />
      </div>
    );
  } else if (module === "orders") {
    let orderQuery = db.from("orders");
    const { data } = await orderQuery
      .select(
        "id,order_number,customer,status,payment_status,total,subtotal,discount,shipping_amount,shipping,carrier,tracking_number,staff_notes,demo,created_at,order_items(snapshot,quantity)",
      )
      .order("created_at", { ascending: false })
      .match(id ? { id } : {})
      .limit(100);
    content = (
      <div className="stack">
        {data?.map((o) => (
          <article key={o.id} className="panel">
            <p>
              {o.order_number} · {o.demo ? "DEMO" : ""} · {o.status} ·{" "}
              {o.payment_status} · {money(o.total, "en")}
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
            {o.status === "delivered" && o.payment_status !== "paid" && (
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
  } else if (module === "inquiries") {
    const { data } = await db
      .from("part_requests")
      .select("*")
      .match(id ? { id } : {})
      .order("created_at", { ascending: false })
      .limit(100);
    content = (
      <div className="stack">
        {data?.map((r) => (
          <article key={r.id} className="panel">
            <h3>{r.contact}</h3>
            <p>{r.description}</p>
            <p>
              {r.vehicle_config_id ??
                Object.values(r.vehicle_details ?? {}).join(" · ")}
            </p>
            {!r.vehicle_config_id && (
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
                Quoted amount · piasters
                <input
                  name="quoted_amount"
                  type="number"
                  min="0"
                  defaultValue={r.quoted_amount ?? ""}
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
              <select name="status" defaultValue={r.status}>
                {["pending", "quoted", "resolved", "closed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </ApiForm>
          </article>
        ))}
      </div>
    );
  } else if (module === "import") content = <Importer />;
  else if (module === "vehicles") {
    const [models, configs, generations] = await Promise.all([
      allRows<any>("vehicle_models"),
      allRows<any>("vehicle_configs"),
      allRows<any>("vehicle_generations"),
    ]);
    const modelOptions = models.map((m) => ({ value: m.id, label: m.name.en }));
    content = (
      <div className="stack">
        <section className="panel stack">
          <h2>Vehicle catalog</h2>
          <Link href="/admin?module=vehicles">New records</Link>
          <details>
            <summary>Existing models</summary>
            {models.map((m) => (
              <p key={m.id}>
                <Link href={"/admin?module=vehicles&id=" + m.id}>
                  {m.name.en}
                </Link>
              </p>
            ))}
          </details>
          <details>
            <summary>Existing generations</summary>
            {generations.map((g) => (
              <p key={g.id}>
                <Link href={"/admin?module=vehicles&id=" + g.id}>{g.name}</Link>
              </p>
            ))}
          </details>
          <details>
            <summary>Existing exact configurations</summary>
            {configs.map((c) => (
              <p key={c.id}>
                <Link href={"/admin?module=vehicles&id=" + c.id}>
                  {c.id} · {c.year} · {c.engine}
                </Link>
              </p>
            ))}
          </details>
        </section>
        <div className="two-col">
          <MerchantForm
            key={"model" + id}
            title="Vehicle model"
            action="admin-model"
            initial={
              models.find((m) => m.id === id) ?? {
                id: "",
                brand: "opel",
                slug: "",
                name: { ar: "", en: "" },
                image: null,
              }
            }
            fields={[
              { path: "id", label: "Model identifier", required: true },
              {
                path: "brand",
                label: "Brand",
                type: "select",
                options: [
                  { value: "opel", label: "Opel" },
                  { value: "peugeot", label: "Peugeot" },
                  { value: "citroen", label: "Citroën" },
                  { value: "mg", label: "MG" },
                ],
              },
              { path: "slug", label: "Model URL slug", required: true },
              { path: "name.ar", label: "Model name · ar", required: true },
              { path: "name.en", label: "Model name · en", required: true },
              {
                path: "image",
                label:
                  "Optional local image path (uploaded photos use Branding)",
                nullable: true,
              },
            ]}
          />
          <MerchantForm
            key={"generation" + id}
            title="Vehicle generation"
            action="admin-generation"
            initial={
              generations.find((g) => g.id === id) ?? {
                id: "",
                model_id: models[0]?.id ?? "",
                name: "",
                year_start: 2020,
                year_end: null,
              }
            }
            fields={[
              { path: "id", label: "Generation identifier", required: true },
              {
                path: "model_id",
                label: "Generation model",
                type: "select",
                options: modelOptions,
              },
              { path: "name", label: "Generation name", required: true },
              {
                path: "year_start",
                label: "First model year",
                type: "number",
                required: true,
              },
              {
                path: "year_end",
                label: "Last model year (blank for ongoing)",
                type: "number",
                nullable: true,
              },
            ]}
          />
          <MerchantForm
            key={"config" + id}
            title="Exact vehicle configuration"
            action="admin-vehicle"
            initial={
              configs.find((c) => c.id === id) ?? {
                id: "",
                model_id: models[0]?.id ?? "",
                year: 2020,
                engine: "",
                generation_id: null,
                engine_code: null,
                engine_capacity: null,
                body: null,
                trim: null,
              }
            }
            fields={[
              { path: "id", label: "Configuration identifier", required: true },
              {
                path: "model_id",
                label: "Configuration model",
                type: "select",
                options: modelOptions,
              },
              {
                path: "year",
                label: "Model year",
                type: "number",
                required: true,
              },
              { path: "engine", label: "Engine description", required: true },
              {
                path: "generation_id",
                label: "Generation (optional)",
                type: "select",
                options: [
                  { value: "", label: "Not supplied" },
                  ...generations.map((g) => ({
                    value: g.id,
                    label: g.model_id + " · " + g.name,
                  })),
                ],
              },
              { path: "engine_code", label: "Engine code", nullable: true },
              {
                path: "engine_capacity",
                label: "Engine capacity · cc",
                type: "number",
                nullable: true,
              },
              { path: "body", label: "Body style", nullable: true },
              { path: "trim", label: "Trim", nullable: true },
            ]}
          />
        </div>
      </div>
    );
  } else if (module === "promotions") {
    const [coupons, categories] = await Promise.all([
      allRows<any>("coupons"),
      allRows<any>("categories"),
    ]);
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
            One coupon per order. Sale prices are edited on the product. Coupon
            categories match the exact selected category; children are excluded.
          </p>
        </section>
        <MerchantForm
          key={id}
          title="Coupon rules and schedule"
          action="admin-coupon"
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
          fields={[
            { path: "code", label: "Coupon code (uppercase)", required: true },
            {
              path: "kind",
              label: "Discount type",
              type: "select",
              options: [
                { value: "percentage", label: "Percentage" },
                { value: "fixed", label: "Fixed piasters" },
              ],
            },
            {
              path: "amount",
              label: "Discount amount",
              type: "number",
              required: true,
            },
            {
              path: "starts_at",
              label: "Valid from (UTC)",
              type: "datetime-local",
              required: true,
            },
            {
              path: "ends_at",
              label: "Valid until (UTC)",
              type: "datetime-local",
              required: true,
            },
            {
              path: "max_redemptions",
              label: "Maximum total uses",
              type: "number",
              required: true,
            },
            {
              path: "per_customer_limit",
              label: "Uses per customer (blank for no per-customer limit)",
              type: "number",
              nullable: true,
            },
            {
              path: "scope_category",
              label: "Exact category",
              type: "select",
              options: [
                { value: "", label: "All categories" },
                ...categories.map((c) => ({ value: c.slug, label: c.name.en })),
              ],
            },
          ]}
        />
      </div>
    );
  } else if (module === "taxonomy") {
    const categories = await allRows<any>("categories");
    const selected = categories.find((c) => c.slug === id);
    content = (
      <div className="two-col">
        <section className="panel stack">
          <h2>Categories</h2>
          <Link className="button secondary" href="/admin?module=taxonomy">
            New category
          </Link>
          {categories
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((c) => (
              <Link key={c.slug} href={"/admin?module=taxonomy&id=" + c.slug}>
                {c.parent_slug ? "↳ " : ""}
                {c.name.en} · {c.sort_order}
              </Link>
            ))}
          <MerchantForm
            title="Manufacturer"
            action="admin-taxonomy"
            initial={{ kind: "manufacturer", name: "" }}
            fields={[
              { path: "name", label: "Manufacturer name", required: true },
            ]}
          />
        </section>
        <MerchantForm
          key={id}
          title="Category content and hierarchy"
          action="admin-taxonomy"
          initial={
            selected
              ? {
                  ...selected,
                  kind: "category",
                  localized: selected.name,
                  name: undefined,
                }
              : {
                  kind: "category",
                  slug: "",
                  localized: { ar: "", en: "" },
                  parent_slug: null,
                  sort_order: 0,
                  description: { ar: "", en: "" },
                }
          }
          fields={[
            { path: "slug", label: "Category URL slug", required: true },
            ...["ar", "en"].flatMap((lang) => [
              {
                path: "localized." + lang,
                label: "Category name · " + lang,
                required: true,
              },
              {
                path: "description." + lang,
                label: "Category introduction · " + lang,
                type: "textarea" as const,
              },
              {
                path: "seo.title." + lang,
                label: "Category SEO title · " + lang,
              },
              {
                path: "seo.description." + lang,
                label: "Category SEO description · " + lang,
                type: "textarea" as const,
              },
            ]),
            {
              path: "parent_slug",
              label: "Parent category",
              type: "select",
              options: [
                { value: "", label: "Top level" },
                ...categories
                  .filter((c) => c.slug !== id)
                  .map((c) => ({ value: c.slug, label: c.name.en })),
              ],
            },
            {
              path: "sort_order",
              label: "Sort order (lower first)",
              type: "number",
              required: true,
            },
          ]}
        />
      </div>
    );
  } else if (module === "settings") {
    const { data: currentSettings } = await db
      .from("site_settings")
      .select("value")
      .eq("key", "storefront")
      .maybeSingle();
    content = (
      <div className="panel">
        <MerchantForm
          title="Storefront copy / assets"
          action="admin-settings"
          initial={
            currentSettings?.value ?? {
              heroImage: "/images/cinematic/hero-road-v2.webp",
            }
          }
          fields={[
            {
              path: "heroImage",
              label: "Hero fallback local image (/images/…)",
            },
            ...["ar", "en"].flatMap((lang) => [
              { path: "storeName." + lang, label: "Store name · " + lang },
              { path: "heroTitle." + lang, label: "Hero heading · " + lang },
              {
                path: "heroIntro." + lang,
                label: "Hero introduction · " + lang,
                type: "textarea" as const,
              },
              {
                path: "contact." + lang,
                label: "Support / contact details · " + lang,
                type: "textarea" as const,
              },
            ]),
          ]}
        />

        <h2>Provider and launch settings</h2>
        <p>COD enabled: {process.env.COD_ENABLED === "true" ? "Yes" : "No"}</p>
        <p>
          Demo checkout in development:{" "}
          {process.env.ALLOW_DEMO_CHECKOUT === "true" ? "Yes" : "No"}
        </p>
        <p>Production rejects demo SKUs regardless of flags.</p>
        <p>
          Card, InstaPay, wallets, installments: unavailable. No approved
          provider configured.
        </p>
        <p>
          Runtime secrets are configured in the deployment environment, never
          through browser forms.
        </p>
      </div>
    );
  } else
    content = (
      <div className="panel">
        <p>
          This module awaits implementation. It is not advertised as
          operational.
        </p>
      </div>
    );
  return (
    <main className="shell section" lang="en" dir="ltr">
      <div className="section-heading">
        <div>
          <span className="eyebrow">MANSOKAR / ADMINISTRATION</span>
          <h1>Control room.</h1>
          <p className="muted">{admin.email}</p>
        </div>
        <Link className="button secondary" href="/en">
          View storefront ↗
        </Link>
      </div>
      <nav className="admin-nav">
        {modules.map((m) => (
          <Link
            href={`/admin?module=${m}`}
            key={m}
            aria-current={m === module ? "page" : undefined}
          >
            {m}
          </Link>
        ))}
      </nav>
      {content}
    </main>
  );
}
