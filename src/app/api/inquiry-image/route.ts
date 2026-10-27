import { requireAdmin, service } from "@/lib/db";
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    const { data, error } = await service()
      .from("part_requests")
      .select("image_path")
      .eq("id", id)
      .single();
    if (error || !data.image_path) throw Error("Not found");
    const { data: signed, error: signError } = await service()
      .storage.from("inquiry-images")
      .createSignedUrl(data.image_path, 60);
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
