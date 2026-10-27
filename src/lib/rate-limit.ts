import "server-only";
import { createHash } from "node:crypto";
import { configured, service } from "./db";
const windows = new Map<string, { count: number; at: number }>();
export async function enforceRate(
  request: Request,
  action: string,
  limit = 30,
) {
  const forwarded =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")
      : process.env.TRUST_PROXY_HEADERS === "true"
        ? request.headers.get("x-forwarded-for")
        : null;
  const ip = forwarded?.split(",")[0].trim() || "local";
  const key = createHash("sha256")
    .update(action + ":" + ip)
    .digest("hex");
  if (configured()) {
    const { data, error } = await service().rpc("consume_rate_limit", {
      p_key: key,
      p_limit: limit,
    });
    if (error || !data) throw Error("Too many requests. Try again shortly.");
    return;
  }
  if (windows.size > 5000) windows.clear();
  const entry = windows.get(key);
  if (!entry || Date.now() - entry.at >= 60000)
    windows.set(key, { count: 1, at: Date.now() });
  else if (++entry.count > limit)
    throw Error("Too many requests. Try again shortly.");
}
