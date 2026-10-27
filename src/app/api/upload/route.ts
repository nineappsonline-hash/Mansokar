import { enforceRate } from "@/lib/rate-limit";
import { limitedFormData } from "@/lib/body";
import { randomUUID } from "node:crypto";
import { configured, requireAdmin, service } from "@/lib/db";
import { sanitizeImage } from "@/lib/uploads";
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    if (!configured()) throw Error("Image storage is not configured");
    const admin = ["catalog", "site"].includes(
      new URL(request.url).searchParams.get("kind") ?? "",
    );
    if (admin) await requireAdmin();
    const db = service();
    await enforceRate(
      request,
      admin ? "admin-upload" : "upload",
      admin ? 30 : 5,
    );
    if (Number(request.headers.get("content-length") || 0) > 5_100_000)
      throw Error("Maximum image size is 5 MB");
    const form = await limitedFormData(request, 5_100_000);
    const file = form.get("image");
    if (!(file instanceof File) || file.size > 5_000_000)
      throw Error("Maximum image size is 5 MB");
    const buffer = await sanitizeImage(Buffer.from(await file.arrayBuffer()));
    const path = randomUUID() + ".jpg";
    const bucket = admin ? "catalog-images" : "inquiry-images";
    const { error } = await db.storage
      .from(bucket)
      .upload(path, buffer, { contentType: "image/jpeg", upsert: false });
    if (error)
      throw Error(
        "Private image bucket is unavailable. Complete storage setup.",
      );
    if (admin) {
      const { data: signed, error: signedError } = await db.storage
        .from(bucket)
        .createSignedUrl(path, 600);
      if (signedError)
        throw Error("Image uploaded but preview could not be loaded");
      return Response.json({ path, url: signed.signedUrl });
    }
    const { data, error: insertError } = await db
      .from("pending_uploads")
      .insert({ path })
      .select("token")
      .single();
    if (insertError) {
      await db.storage.from(bucket).remove([path]);
      throw Error("Unable to associate image");
    }
    return Response.json({ token: data.token });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      {
        status:
          error instanceof Error && error.message.includes("Too many")
            ? 429
            : 400,
      },
    );
  }
}
