import { configured, service } from "@/lib/db";
export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("ready") === "1") {
    let ready = false;
    try {
      if (configured()) {
        const { error } = await service()
          .from("site_settings")
          .select("key")
          .limit(1);
        ready = !error;
      }
    } catch {}
    return Response.json(
      { status: ready ? "ready" : "not-ready", service: "mansokar" },
      { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { status: "ok", service: "mansokar" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
