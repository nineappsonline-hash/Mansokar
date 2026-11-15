/**
 * Service-only cleanup executor. Not scheduled or wired to production.
 * The DB claim RPC grants each job a short lease; finalize RPC rejects stale tokens.
 * A storage object may only be removed when no product references its path.
 */
export type CleanupJob = {
  id: number;
  bucket: string;
  path: string;
  lease_token: string;
};
export type CleanupOutcome = "deleted" | "referenced" | "failed";
export interface CleanupBackend {
  isReferenced(path: string): Promise<boolean>;
  remove(bucket: string, path: string): Promise<void>;
  finish(job: CleanupJob, success: boolean, error?: string): Promise<boolean>;
}
export function safeCleanupPath(path: string): boolean {
  return /^[a-f0-9-]+\.jpg$/.test(path);
}
export async function processCleanupJob(
  job: CleanupJob,
  backend: CleanupBackend,
): Promise<CleanupOutcome> {
  if (job.bucket !== "catalog-images" || !safeCleanupPath(job.path)) {
    await backend.finish(job, false, "Invalid storage bucket or path");
    return "failed";
  }
  try {
    if (await backend.isReferenced(job.path)) {
      // A referenced path is not safe to delete. Leave it retryable.
      await backend.finish(job, false, "Image is referenced by an active product");
      return "referenced";
    }
    await backend.remove(job.bucket, job.path);
    const acknowledged = await backend.finish(job, true);
    if (!acknowledged) {
      // Another worker may own the lease; a subsequent retry must be idempotent.
      return "failed";
    }
    return "deleted";
  } catch (error) {
    await backend.finish(
      job,
      false,
      error instanceof Error ? error.message : "Unknown storage cleanup failure",
    );
    return "failed";
  }
}
