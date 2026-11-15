import { timingSafeEqual } from "node:crypto";
import { service } from "@/lib/db";
import { processCleanupJob, type CleanupJob } from "@/lib/product-image-cleanup";

export const runtime = "nodejs";
export const maxDuration = 60;

// Intentionally not in vercel.json crons. Enable only after staging migration,
// concurrency tests and review of storage-path reuse protections.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + (secret ?? ""));
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (process.env.PRODUCT_IMAGE_CLEANUP_ENABLED !== "true") {
    return Response.json({ error: "Cleanup worker is disabled" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const db = service();
    const { data, error } = await db.rpc("claim_product_image_cleanup_jobs", { p_limit: 10 });
    if (error) throw error;
    const results: Record<string, number> = { deleted: 0, referenced: 0, failed: 0 };
    for (const row of (data ?? []) as CleanupJob[]) {
      const outcome = await processCleanupJob(row, {
        isReferenced: async (path) => {
          const { count, error: referenceError } = await db.from("product_images")
            .select("id", { count: "exact", head: true }).eq("path", path);
          if (referenceError) throw referenceError;
          return (count ?? 0) > 0;
        },
        remove: async (bucket, path) => {
          const { error: removeError } = await db.storage.from(bucket).remove([path]);
          if (removeError) throw removeError;
        },
        finish: async (job, success, message) => {
          const { data: finished, error: finishError } = await db.rpc(
            "finish_product_image_cleanup_job",
            { p_id: job.id, p_lease: job.lease_token, p_success: success, p_error: message ?? null },
          );
          if (finishError) throw finishError;
          return finished === true;
        },
      });
      results[outcome] += 1;
    }
    return Response.json({ processed: (data ?? []).length, results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Cleanup failed; inspect server logs" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
