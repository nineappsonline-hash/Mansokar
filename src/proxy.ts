import {
  migrationRedirect,
  rootLocaleRedirect,
  legacyVehicleModelRedirect,
  siteOrigin,
  indexingApproved,
} from "@/lib/site-url";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const canonicalRoot = rootLocaleRedirect(request.nextUrl);
  if (canonicalRoot) return NextResponse.redirect(canonicalRoot, 308);
  const migratedModel = legacyVehicleModelRedirect(request.nextUrl);
  if (migratedModel) return NextResponse.redirect(migratedModel, 308);
  const redirect = migrationRedirect(request.nextUrl);
  if (redirect) return NextResponse.redirect(redirect, 308);
  const headers = new Headers(request.headers);
  headers.set("x-mopc-pathname", request.nextUrl.pathname);
  headers.set(
    "x-mansokar-locale",
    request.nextUrl.pathname.startsWith("/en") ||
      request.nextUrl.pathname.startsWith("/admin")
      ? "en"
      : "ar",
  );
  let response = NextResponse.next({ request: { headers } });
  const protectPreview = () => {
    if (
      /^\/(admin|api|auth)(\/|$)/.test(request.nextUrl.pathname) ||
      /^\/(ar|en)\/(cart|checkout|account|garage|favorites|compare|track-order|order)(\/|$)/.test(
        request.nextUrl.pathname,
      ) ||
      !indexingApproved() ||
      request.nextUrl.hostname !== new URL(siteOrigin()).hostname
    )
      response.headers.set("X-Robots-Tag", "noindex, follow");
  };
  protectPreview();
  const authPath =
    /^\/(admin|api|ar\/(account|garage)|en\/(account|garage))/.test(
      request.nextUrl.pathname,
    );
  if (
    !authPath ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return response;
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          headers.set("cookie", request.headers.get("cookie") ?? "");
          response = NextResponse.next({ request: { headers } });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.getUser();
  protectPreview();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
