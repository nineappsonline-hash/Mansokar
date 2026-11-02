import { NextResponse } from "next/server";
import { configured, service } from "@/lib/db";
import { mapEasyKashStatus, verifyEasyKashSignature } from "@/lib/easykash";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!configured())
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    const payload = (await request.json()) as Record<string, unknown>;
    const secret = process.env.EASYKASH_HMAC_SECRET;
    if (!secret)
      return NextResponse.json(
        { error: "Payment webhook secret is not configured" },
        { status: 500 },
      );
    if (!verifyEasyKashSignature(payload, secret))
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    const reference = String(payload.customerReference ?? "");
    if (!reference)
      return NextResponse.json({
        received: true,
        warning: "Missing customer reference",
      });
    const db = service();
    const { data: order, error } = await db
      .from("orders")
      .select("id,total")
      .eq("payment_reference", reference)
      .maybeSingle();
    if (error) throw error;
    if (!order)
      return NextResponse.json({
        received: true,
        warning: "Order not found",
      });
    const amount = Math.round(Number(payload.Amount) * 100);
    if (!Number.isFinite(amount) || amount !== Number(order.total))
      return NextResponse.json(
        { error: "Payment amount mismatch" },
        { status: 400 },
      );
    const status = mapEasyKashStatus(payload.status);
    if (status === "pending")
      return NextResponse.json({ received: true, status });
    const easykashRef = payload.easykashRef
      ? String(payload.easykashRef)
      : null;
    const event = easykashRef || `${reference}:${status}:${amount}`;
    const { data: accepted, error: rpcError } = await db.rpc(
      "record_payment_event",
      {
        p_provider: "easykash",
        p_event: event,
        p_order: order.id,
        p_amount: amount,
        p_status: status,
        p_reference: status === "paid" ? easykashRef : null,
      },
    );
    if (rpcError) throw rpcError;
    return NextResponse.json({
      received: true,
      status,
      duplicate: accepted === false,
    });
  } catch (error) {
    return NextResponse.json({
      received: true,
      error: error instanceof Error ? error.message : "Callback failed",
    });
  }
}
