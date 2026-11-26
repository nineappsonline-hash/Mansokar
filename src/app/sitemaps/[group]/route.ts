import { siteOrigin } from "@/lib/site-url";
import { sitemapPublished } from "@/lib/sitemap-visibility";
import { searchPages } from "@/lib/seo-pages";
import {
  sitemapGroups,
  sitemapXml,
  type SitemapGroup,
} from "@/lib/sitemap-xml";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ group: string }> },
) {
  if (!sitemapPublished()) return new Response(null, { status: 404 });
  const { group } = await params;
  const name = group.replace(/\.xml$/, "") as SitemapGroup;
  if (!group.endsWith(".xml") || !sitemapGroups.includes(name))
    return new Response("Not found", { status: 404 });
  return new Response(sitemapXml(await searchPages(), siteOrigin(), name), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
