import { configured, service } from "@/lib/db";
import { enforceRate } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    if (!configured())
      return Response.json({ error: "Not configured" }, { status: 503 });
    await enforceRate(request, "order-status", 120);
    const token = new URL(request.url).searchParams.get("token") ?? "";
    if (!/^[a-f0-9]{64}$/.test(token))
      return Response.json({ error: "Not found" }, { status: 404 });
    const { data, error } = await service()
      .from("orders")
      .select("status,payment_status,payment_method,order_number")
      .eq("public_token", token)
      .maybeSingle();
    if (error) throw error;
    if (!data) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unavailable" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
