import { siteIdentity } from "@/lib/site-identity";
import { storefrontSettings } from "@/lib/db";
import "./globals.css";
import { headers } from "next/headers";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const locale =
    (await headers()).get("x-mansokar-locale") === "en" ? "en" : "ar";
  const settings = await storefrontSettings();
  const name =
    settings.storeName?.[locale] ?? (locale === "ar" ? "موبك" : "MOPC");
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    openGraph: {
      siteName: name,
      images: [{ url: "/images/mopc/logo.png", alt: "MOPC · موبك" }],
    },
    title: {
      default:
        settings.storeName?.[locale] ?? (locale === "ar" ? "موبك" : "MOPC"),
      template: `%s | ${name}`,
    },
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
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
  const settings = await storefrontSettings();
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              siteIdentity(
                process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
                settings.storeName?.[locale] ||
                  (locale === "ar" ? "موبك" : "MOPC"),
              ),
            ).replace(/</g, "\\u003c"),
          }}
        />
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
