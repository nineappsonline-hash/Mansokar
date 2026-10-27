import { type NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { authClient } from "@/lib/db";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const { error } = await (
      await authClient()
    ).auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/ar/account", request.url));
  }
  const token_hash = request.nextUrl.searchParams.get("token_hash"),
    type = request.nextUrl.searchParams.get("type");
  if (token_hash && ["signup", "email"].includes(type ?? "")) {
    const { error } = await (
      await authClient()
    ).auth.verifyOtp({ token_hash, type: type as EmailOtpType });
    if (!error)
      return NextResponse.redirect(new URL("/ar/account", request.url));
  }
  return NextResponse.redirect(
    new URL("/ar/account?verification=failed", request.url),
  );
}
