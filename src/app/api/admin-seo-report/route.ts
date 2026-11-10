import { requireAdmin } from "@/lib/db";
import { seoHealthData } from "@/lib/seo-health-data";
import { csvReport } from "@/lib/seo-health";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return new Response(csvReport(await seoHealthData()), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mopc-seo-audit.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Administrator access required or report unavailable" },
      {
        status:
          error instanceof Error &&
          ["Unauthorized", "Forbidden"].includes(error.message)
            ? 401
            : 503,
        headers: { "Cache-Control": "private, no-store" },
      },
    );
  }
}
