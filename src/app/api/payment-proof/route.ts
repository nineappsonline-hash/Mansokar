import { requireAdmin, service } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw Error("Not found");
    const { data, error } = await service()
      .from("manual_transfers")
      .select("proof_path")
      .eq("id", id)
      .single();
    if (error || !data.proof_path) throw Error("Not found");
    const { data: signed, error: signError } = await service()
      .storage.from("inquiry-images")
      .createSignedUrl(data.proof_path, 60);
    if (signError) throw signError;
    return new Response(null, {
      status: 302,
      headers: {
        Location: signed.signedUrl,
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
