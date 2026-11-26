import { requireAdmin, allRows, configured, service } from "@/lib/db";
import { merchantImagesByProduct, merchantReadiness } from "@/lib/merchant-readiness";
import { isRemoteImageUrl } from "@/lib/image-links";
import type { Product } from "@/lib/catalog";

export const dynamic = "force-dynamic";

/** Admin-only audit: no product records, credentials or personal data exposed. */
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    await requireAdmin();
  } catch {
    return Response.json({ error: "Admin authentication required" }, { status: 401, headers });
  }
  if (!configured()) return Response.json({ error: "Database not configured" }, { status: 503, headers });
  try {
    const [products, images, policies] = await Promise.all([
      allRows<Product>("products"),
      allRows<{ id: string; product_id: string; path: string }>(
        "product_images", "id,product_id,path"
      ),
      service()
        .from("cms_pages")
        .select("slug")
        .in("slug", ["policies/privacy", "policies/terms", "policies/returns"])
        .eq("published", true),
    ]);
    if (policies.error) throw policies.error;
    const imagesByProduct = merchantImagesByProduct(images, isRemoteImageUrl);
    const rows = products.map((product) => ({
      product,
      images: imagesByProduct.get(product.id) ?? [],
    }));
    const published = new Set((policies.data ?? []).map((p) => p.slug));
    const required = ["policies/privacy", "policies/terms", "policies/returns"];
    const policyStatus = {
      published: required.filter((slug) => published.has(slug)),
      missing: required.filter((slug) => !published.has(slug)),
    };
    const gates = {
      feedEnabled: process.env.MERCHANT_FEED_ENABLED === "true",
      egyptEligibilityConfirmed: process.env.MERCHANT_EG_ELIGIBILITY_CONFIRMED === "true",
      shippingConfigured: process.env.MERCHANT_SHIPPING_CONFIGURED === "true",
      feedCredentialConfigured: Boolean(process.env.MERCHANT_FEED_TOKEN),
    };
    const arabic = merchantReadiness(rows, "ar");
    const english = merchantReadiness(rows, "en");
    return Response.json({
      gates,
      policies: policyStatus,
      feeds: { ar: arabic, en: english },
      readyForGoogle: Object.values(gates).every(Boolean) &&
        policyStatus.missing.length === 0 &&
        arabic.productsEligible > 0,
      notice: "Shipping and merchant-country eligibility must be confirmed outside this report; no stock, origin or condition values are inferred.",
    }, { headers });
  } catch {
    return Response.json({ error: "Readiness audit failed" }, { status: 503, headers });
  }
}
