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
  const db = service();
  let content: React.ReactNode;
  if (module === "overview" || module === "reports") {
    content = <AdminReports module={module} from={from} to={to} />;
  } else if (module === "seo") content = <AdminSeo />;
  else if (module === "analytics") {
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
    content = (
      <AdminProducts
        products={products}
        images={productPictures}
        fitments={fitments}
        vehicles={vehicles}
        carBrands={brands}
        carModels={models}
        manufacturers={manufacturers.map((m) => m.name)}
        selectedId={selected?.id}
        initialView={view === "brands" || view === "excel" ? view : "products"}
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
        excel={<Importer />}
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
            Set and enable normal and express rates separately for each
            governorate. All prices here are in EGP. New rates stay blank and
            disabled until you configure them.
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
    <AdminWorkspace module={module} email={admin.email ?? "Administrator"}>
      {content}
    </AdminWorkspace>
  );
}
