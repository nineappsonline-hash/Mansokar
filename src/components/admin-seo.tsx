import { readApplications } from "@/lib/product-applications";
import { countryOfOrigin } from "@/lib/product-specifications";
import Link from "next/link";
import { allRows } from "@/lib/db";
import { searchPages } from "@/lib/seo-pages";
import type { Product } from "@/lib/catalog";
export async function AdminSeo() {
  const [products, images, fitments, pages, models] = await Promise.all([
    allRows<Product>("products"),
    allRows<{ product_id: string }>("product_images", "product_id"),
    allRows<{ product_id: string }>("product_fitments", "product_id"),
    searchPages(),
    allRows<{ id: string }>("vehicle_models", "id"),
  ]);
  const withImages = new Set(images.map((p) => p.product_id)),
    withFitments = new Set(fitments.map((p) => p.product_id));
  const modelIds = new Set(models.map((m) => m.id));
  const hasCompatibility = (p: Product) =>
    withFitments.has(p.id) ||
    readApplications(p.specs).some(
      (a) => modelIds.has(a.model_id) && a.years.length > 0,
    );
  const real = products.filter((p) => !p.demo),
    published = real.filter((p) => p.status === "published");
  const issues = (p: Product) => [
    ...(!withImages.has(p.id) ? ["Product photos"] : []),
    ...(!hasCompatibility(p) ? ["Car make, model & years"] : []),
    ...(!countryOfOrigin(p.specs.country_of_origin)
      ? ["Verified country of origin"]
      : []),
    ...(!p.partNumber ? ["Part number"] : []),
    ...(!p.description.ar.trim() || !p.description.en.trim()
      ? ["Arabic/English descriptions"]
      : []),
  ];
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const launched = process.env.STORE_LAUNCH_APPROVED === "true";
  return (
    <div className="stack">
      <section className="panel stack">
        <h2>SEO and answer-content status</h2>
        <p>
          XML sitemap:{" "}
          <a className="text-link" href="/sitemap.xml">
            /sitemap.xml ↗
          </a>{" "}
          · <Link href="/ar/site-map">Arabic site map ↗</Link> ·{" "}
          <Link href="/en/site-map">English site map ↗</Link>
        </p>
        <p>
          {pages.length * 2} localized sitemap URLs · {published.length}{" "}
          published real products · {products.filter((p) => p.demo).length} demo
          products excluded.
        </p>
        <p>
          Canonical site URL:{" "}
          {site ||
            "Not configured — set NEXT_PUBLIC_SITE_URL before deployment"}
        </p>
        <p>
          {launched
            ? "Launch indexing flag is enabled. Individual draft, demo and private page exclusions still apply."
            : "Search indexing is currently disabled by STORE_LAUNCH_APPROVED. The sitemap is available for review, but page noindex directives still prevent search visibility."}
        </p>
        <p>
          After deployment, verify ownership in Google Search Console and submit
          the canonical /sitemap.xml URL. Sitemap availability alone does not
          mean that pages are indexed. Search Console submission has not been
          performed by this app.
        </p>
      </section>
      <section className="panel stack">
        <h2>Real-product content checklist</h2>
        {!real.length && (
          <p>
            No real product records yet. Create or import verified merchant
            products; demonstration products are not included in the sitemap.
          </p>
        )}
        {real.map((p) => (
          <div key={p.id}>
            <h3>
              <Link href={`/admin?module=products&id=${p.id}`}>
                {p.sku} · {p.name.en}
              </Link>
            </h3>
            <p>
              {p.status} ·{" "}
              {issues(p).join(" · ") ||
                "Photos, compatibility, origin, part number and bilingual descriptions present"}
            </p>
            {!withImages.has(p.id) && (
              <Link href={`/admin?module=products&id=${p.id}&tab=photos`}>
                Add product photos ↗
              </Link>
            )}
          </div>
        ))}
      </section>
      <section className="panel stack">
        <h2>Remaining search work</h2>
        <p>
          Complete missing product photos, country of origin and vehicle years.
          Review published policies and validate mobile performance on the
          production domain, then measure Egypt queries, inquiries and collected
          sales. Search rankings and answer-engine citations are not guaranteed.
        </p>
        <Link href="/admin?module=cms">Review CMS pages ↗</Link>
        <Link href="/admin?module=vehicles">
          Complete vehicle configurations ↗
        </Link>
      </section>
    </div>
  );
}
