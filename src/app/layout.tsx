import { siteCopy } from "@/lib/site-copy";
import { siteOrigin } from "@/lib/site-url";
import { siteIdentity } from "@/lib/site-identity";
import { notFound } from "next/navigation";
import { catalog, vehicleCatalog } from "@/lib/db";
import { storefrontSettings } from "@/lib/db";
import "./globals.css";
import "@/components/mopc-premium-v2.css";
import "@/components/mopc-showroom.css";
import { headers } from "next/headers";
import type { Metadata } from "next";
export async function generateMetadata(): Promise<Metadata> {
  const locale =
    (await headers()).get("x-mansokar-locale") === "en" ? "en" : "ar";
  const settings = await storefrontSettings();
  const name =
    settings.storeName?.[locale] ?? (locale === "ar" ? "MOPC" : "MOPC");
  const copy = siteCopy[locale];
  const title = `${copy.heading} | ${name}`;
  return {
    metadataBase: new URL(siteOrigin()),
    applicationName: name,
    title: { default: title, template: `%s | ${name}` },
    description: copy.description,
    openGraph: {
      type: "website",
      siteName: name,
      title,
      description: copy.description,
      locale: locale === "ar" ? "ar_EG" : "en_EG",
      images: [
        { url: "/images/mopc/logo.png", alt: "MOPC — قطع غيار السيارات" },
      ],
    },
    twitter: {
      card: "summary",
      title,
      description: copy.description,
      images: ["/images/mopc/logo.png"],
    },
    ...(process.env.BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": process.env.BING_SITE_VERIFICATION } }
      : {}),
    ...(process.env.GOOGLE_SITE_VERIFICATION
      ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } }
      : {}),
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale =
    (await headers()).get("x-mansokar-locale") === "en" ? "en" : "ar";
  // Validate resources above the root loading boundary so missing URLs retain HTTP 404.
  const pathname = (await headers()).get("x-mopc-pathname") || "";
  const segments = pathname.split("/").filter(Boolean);
  if (["ar", "en"].includes(segments[0]) && segments[1] === "brands") {
    const { brands, models } = await vehicleCatalog();
    if (
      !brands.some((b) => b.slug === segments[2]) ||
      segments.length > 4 ||
      (segments[3] &&
        !models.some((m) => m.brand === segments[2] && m.slug === segments[3]))
    )
      notFound();
  }
  if (
    ["ar", "en"].includes(segments[0]) &&
    segments[1] === "products" &&
    (segments.length !== 3 || !(await catalog({ slug: segments[2] })).length)
  )
    notFound();
  const settings = await storefrontSettings();
  return (
    <html
      lang={locale === "ar" ? "ar-EG" : "en-EG"}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-scroll-behavior="smooth"
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              siteIdentity(
                siteOrigin(),
                settings.storeName?.[locale] || siteCopy[locale].name,
                locale,
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
