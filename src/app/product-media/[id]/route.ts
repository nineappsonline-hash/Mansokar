import { configured, service } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!configured()) return new Response(null, { status: 404 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response(null, { status: 404 });
  const db = service();
  const { data: image, error } = await db
    .from("product_images")
    .select("path,products!inner(status,demo)")
    .eq("id", id)
    .eq("products.status", "published")
    .eq("products.demo", false)
    .maybeSingle();
  if (error || !image) return new Response(null, { status: 404 });
  const { data: file, error: downloadError } = await db.storage
    .from("catalog-images")
    .download(image.path);
  if (downloadError || !file) return new Response(null, { status: 404 });
  return new Response(file, {
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
