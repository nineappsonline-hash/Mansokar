import Link from "next/link";
import { seoHealthData } from "@/lib/seo-health-data";
import { searchPages } from "@/lib/seo-pages";
import { siteOrigin, TARGET_ORIGIN, indexingApproved } from "@/lib/site-url";
import { AdminSeoDashboard } from "./admin-seo-dashboard";
export async function AdminSeo() {
  const [rows, pages] = await Promise.all([seoHealthData(), searchPages()]);
  return (
    <div className="stack">
      <section className="panel stack">
        <h2>SEO & AI discovery readiness</h2>
        <p>
          Current canonical origin: {siteOrigin()} · Migration target:{" "}
          {TARGET_ORIGIN}
        </p>
        <p>
          Domain cutover:{" "}
          {process.env.SEO_DOMAIN_MIGRATION === "true"
            ? "enabled"
            : "awaiting domain preflight and owner approval"}
          . Indexing launch flag: {indexingApproved() ? "enabled" : "disabled"}.
        </p>
        <p>
          {pages.length} eligible canonical page records. Sitemaps include only
          available translations; empty model pages are excluded.
        </p>
        <nav className="admin-nav">
          <a href="/sitemap.xml">Sitemap index</a>
          <a href="/sitemaps/products.xml">Products</a>
          <a href="/sitemaps/vehicles.xml">Vehicles</a>
          <a href="/sitemaps/guides.xml">Guides</a>
          <Link href="/ar/site-map">HTML site map</Link>
          <a href="/api/admin-seo-report">Download audit</a>
        </nav>
        <p>
          Search Console verification token:{" "}
          {process.env.GOOGLE_SITE_VERIFICATION
            ? "configured; ownership and data still require verification"
            : "not configured"}
          . GA4 ID:{" "}
          {process.env.NEXT_PUBLIC_GA4_ID
            ? "configured; collection requires consent"
            : "not configured"}
          .
        </p>
        <p>
          Merchant feed:{" "}
          {process.env.MERCHANT_FEED_ENABLED === "true"
            ? "flag enabled; policy and verified data gates still apply"
            : "disabled pending eligibility, shipping, policy and stock verification"}
          . <Link href="/admin?module=settings">Review checkout readiness</Link>
          .
        </p>
        <p>
          Search ranks, impressions and AI citations are not measured by this
          app without connected external accounts. No historical values are
          fabricated.
        </p>
      </section>
      <AdminSeoDashboard rows={rows} />
    </div>
  );
}
