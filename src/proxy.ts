import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(
    "x-mansokar-locale",
    request.nextUrl.pathname.startsWith("/en") ||
      request.nextUrl.pathname.startsWith("/admin")
      ? "en"
      : "ar",
  );
  let response = NextResponse.next({ request: { headers } });
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
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/ar/:path*", "/en/:path*", "/admin/:path*", "/api/:path*"],
};
