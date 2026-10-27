import { timingSafeEqual } from "node:crypto";
import { maintainTemporaryData } from "@/lib/maintenance";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from("Bearer " + (secret ?? ""));
  if (
    !secret ||
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  )
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  try {
    return Response.json(
      await maintainTemporaryData(
        new URL(request.url).searchParams.get("dryRun") === "1",
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Maintenance failed; inspect service logs and retry." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
