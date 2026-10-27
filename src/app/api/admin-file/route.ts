import { limitedFormData } from "@/lib/body";
import { requireAdmin } from "@/lib/db";
import { parseSpreadsheet } from "@/lib/spreadsheets";
export async function POST(request: Request) {
  try {
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return Response.json({ error: "Invalid origin" }, { status: 403 });
    await requireAdmin();
    if (Number(request.headers.get("content-length") || 0) > 1_100_000)
      throw Error("Maximum upload is 1 MB");
    const data = await limitedFormData(request, 1_100_000);
    const file = data.get("file");
    if (!(file instanceof File) || file.size > 1_000_000)
      throw Error("Maximum upload is 1 MB");
    const rows = await parseSpreadsheet(await file.arrayBuffer(), file.name);
    return Response.json(
      { rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unable to parse file",
      },
      { status: 400 },
    );
  }
}
