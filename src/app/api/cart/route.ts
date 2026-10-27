import type { NextRequest } from "next/server";
import { POST as actionPost } from "../[action]/route";
import { currentUser, service } from "@/lib/db";
export async function GET() {
  const user = await currentUser();
  if (!user)
    return Response.json(
      { items: [], authenticated: false },
      { headers: { "Cache-Control": "no-store" } },
    );
  const { data, error } = await service()
    .from("member_carts")
    .select("items")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error)
    return Response.json({ error: "Cart unavailable" }, { status: 503 });
  return Response.json(
    { items: data?.items ?? [], authenticated: true },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  return actionPost(request, { params: Promise.resolve({ action: "cart" }) });
}
