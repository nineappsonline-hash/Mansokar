import crypto from "node:crypto";
import { requireAdmin, allRows, service } from "@/lib/db";
import { TARGET_ORIGIN } from "@/lib/site-url";
import { merchantFeed, feedExclusionReasons } from "@/lib/merchant-feed";
import { isRemoteImageUrl } from "@/lib/image-links";
import { merchantImagesByProduct } from "@/lib/merchant-readiness";
import type { Product } from "@/lib/catalog";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const secret = process.env.MERCHANT_FEED_TOKEN;
    const auth = request.headers.get("authorization") || "";
    let token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (auth.startsWith("Basic ")) {
      const decoded = Buffer.from(auth.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (
        decoded.slice(0, separator) ===
        (process.env.MERCHANT_FEED_USERNAME || "mopc-feed")
      )
        token = decoded.slice(separator + 1);
    }
    const authorized =
      secret &&
      token &&
      Buffer.byteLength(secret) === Buffer.byteLength(token) &&
      crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(token));
    if (!authorized) await requireAdmin();
    const headers = { "Cache-Control": "private, no-store" };
    if (
      process.env.MERCHANT_FEED_ENABLED !== "true" ||
      process.env.MERCHANT_EG_ELIGIBILITY_CONFIRMED !== "true" ||
      process.env.MERCHANT_SHIPPING_CONFIGURED !== "true"
    )
      return Response.json(
        {
          error:
            "Feed is disabled until merchant eligibility and shipping setup are verified.",
        },
        { status: 503, headers },
      );
    const { data: policies, error } = await service()
      .from("cms_pages")
      .select("slug")
      .in("slug", ["policies/privacy", "policies/terms", "policies/returns"])
      .eq("published", true);
    if (error) throw error;
    if (policies.length !== 3)
      return Response.json(
        {
          error: "Publish approved checkout policies before enabling the feed.",
        },
        { status: 503, headers },
      );
    const [products, images] = await Promise.all([
      allRows<Product>("products"),
      allRows<{ id: string; product_id: string; path: string }>(
        "product_images",
      ),
    ]);
    const locale =
      new URL(request.url).searchParams.get("locale") === "en" ? "en" : "ar";
    const imagesByProduct = merchantImagesByProduct(images, isRemoteImageUrl);
    const rows = products.map((product) => ({
      product,
      images: imagesByProduct.get(product.id) ?? [],
    }));
    if (
      !rows.some(
        (r) => !feedExclusionReasons(r.product, locale, r.images).length,
      )
    )
      return Response.json(
        {
          error:
            "No products have all required verified stock, condition, language and image data.",
        },
        { status: 503, headers },
      );
    return new Response(merchantFeed(rows, locale, TARGET_ORIGIN), {
      headers: { ...headers, "Content-Type": "application/xml; charset=utf-8" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error &&
          ["Forbidden", "Unauthorized"].includes(error.message)
            ? "Administrator or feed-token authentication required"
            : "Feed unavailable",
      },
      {
        status:
          error instanceof Error &&
          ["Forbidden", "Unauthorized"].includes(error.message)
            ? 401
            : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
