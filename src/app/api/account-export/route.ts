import { currentUser, allRows } from "@/lib/db";
import { enforceRate } from "@/lib/rate-limit";
export async function GET(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await enforceRate(request, "account-export", 3);
    const fields: Record<string, string> = {
      profiles: "user_id,name,phone,locale",
      saved_addresses: "id,user_id,name,phone,area_id,details",
      garage_vehicles: "id,user_id,vehicle_config_id,nickname,is_active",
      member_carts: "user_id,items,updated_at",
      orders:
        "id,order_number,customer,shipping,subtotal,discount,shipping_amount,total,status,payment_status,created_at,carrier,tracking_number",
      part_requests:
        "id,contact,vehicle_config_id,vehicle_details,description,status,created_at,quoted_amount",
    };
    const entries = await Promise.all(
      Object.entries(fields).map(
        async ([table, projection]) =>
          [
            table,
            await allRows(table, projection, { user_id: user.id }),
          ] as const,
      ),
    );
    const items = await allRows<{
      order_id: string;
      snapshot: unknown;
      quantity: number;
      vehicle_config_id: string | null;
      orders: unknown;
    }>(
      "order_items",
      "order_id,snapshot,quantity,vehicle_config_id,orders!inner(user_id)",
      { "orders.user_id": user.id },
    );
    const output = {
      format_version: 1,
      account: {
        id: user.id,
        email: user.email ?? null,
        phone: user.phone ?? null,
        created_at: user.created_at,
        email_confirmed_at: user.email_confirmed_at ?? null,
      },
      ...Object.fromEntries(entries),
      order_items: items.map(({ orders, ...item }) => item),
    };
    return new Response(JSON.stringify(output, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          'attachment; filename="mansokar-account-data.json"',
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    const rate = error instanceof Error && error.message.startsWith("Too many");
    return Response.json(
      {
        error: rate
          ? "Too many exports. Please try again shortly."
          : "Export unavailable",
      },
      { status: rate ? 429 : 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
