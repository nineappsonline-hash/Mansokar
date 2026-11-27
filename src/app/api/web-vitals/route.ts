import { webVitalInput } from "@/lib/web-vitals";

/** Lightweight first-party ingestion; no session, cookies, or IP are retained. */
export async function POST(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return new Response(null, { status: 403 });
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 1024) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return new Response(null, { status: 413 });
    body = JSON.parse(raw);
  } catch { return new Response(null, { status: 400 }); }
  const parsed = webVitalInput.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 400 });
  // Coarse-only fields; never log request headers, body verbatim, IP, URL, or user IDs.
  if (process.env.NODE_ENV === "production")
    console.info("[mopc-web-vital]", JSON.stringify({
      ...parsed.data,
      source: "field",
      measuredAt: new Date().toISOString(),
    }));
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
