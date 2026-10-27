import "server-only";
import { service } from "./db";
// Temporary upload claims expire after 15 minutes. The extra day avoids touching active forms.
export async function maintainTemporaryData(dryRun = false) {
  const db = service();
  const cutoff = new Date(Date.now() - 86400000).toISOString();
  const { data: pending, error } = await db
    .from("pending_uploads")
    .select("token,path")
    .eq("claimed", false)
    .lt("created_at", cutoff)
    .order("created_at")
    .limit(100);
  if (error) throw error;
  let candidates = pending ?? [];
  if (candidates.length) {
    const { data: used, error } = await db
      .from("part_requests")
      .select("image_path")
      .in(
        "image_path",
        candidates.map((p) => p.path),
      );
    if (error) throw error;
    const referenced = new Set(used.map((r) => r.image_path));
    candidates = candidates.filter((p) => !referenced.has(p.path));
  }
  let removed = 0;
  if (candidates.length && !dryRun) {
    const { error } = await db.storage
      .from("inquiry-images")
      .remove(candidates.map((p) => p.path));
    if (error) throw error;
    const { error: rowError, count } = await db
      .from("pending_uploads")
      .delete({ count: "exact" })
      .in(
        "token",
        candidates.map((p) => p.token),
      )
      .eq("claimed", false)
      .lt("created_at", cutoff);
    if (rowError) throw rowError;
    removed = count ?? 0;
  }
  let oldLimits = db
    .from("rate_limits")
    .select("key", { head: true, count: "exact" })
    .lt("window_at", cutoff);
  const { count: limits, error: limitError } = await oldLimits;
  if (limitError) throw limitError;
  const { count: challenges, error: challengeError } = await db
    .from("tracking_challenges")
    .select("id", { head: true, count: "exact" })
    .lt("expires_at", cutoff);
  if (challengeError) throw challengeError;
  if (!dryRun) {
    const a = await db.from("rate_limits").delete().lt("window_at", cutoff);
    if (a.error) throw a.error;
    const b = await db
      .from("tracking_challenges")
      .delete()
      .lt("expires_at", cutoff);
    if (b.error) throw b.error;
  }
  return {
    dryRun,
    expiredUploadCandidates: candidates.length,
    removedUploads: removed,
    staleRateLimits: limits ?? 0,
    expiredChallenges: challenges ?? 0,
  };
}
