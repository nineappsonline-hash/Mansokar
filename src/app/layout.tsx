import { storefrontSettings } from "@/lib/db";
import "./globals.css";
import { headers } from "next/headers";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const locale =
    (await headers()).get("x-mansokar-locale") === "en" ? "en" : "ar";
  const settings = await storefrontSettings();
  const name = settings.storeName?.[locale] ?? "Mansokar";
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: {
      default: settings.storeName?.[locale] ?? "Mansokar | DriveParts",
      template: `%s | ${name}`,
    },
    description:
      settings.heroIntro?.[locale] ??
      "Automotive parts for Opel, Peugeot, Citroën and MG. Fictional demonstration catalog.",
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale =
    (await headers()).get("x-mansokar-locale") === "en" ? "en" : "ar";
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
    >
      <body>
        <noscript>
          {/* Reveal animations rely on JavaScript; without it nothing may hide. */}
          <style
            dangerouslySetInnerHTML={{
              __html:
                "[data-motion-reveal]{opacity:1!important;transform:none!important}",
            }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
