import { siteCopy } from "./site-copy";
import type { Locale } from "./catalog";

export function siteIdentity(
  base: string,
  name: string,
  locale: Locale = name === "موبِك" ? "ar" : "en",
) {
  const origin = new URL(base).origin;
  const copy = siteCopy[locale];
  const alternateName = locale === "ar" ? siteCopy.en.name : siteCopy.ar.name;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name,
        alternateName,
        description: copy.description,
        logo: `${origin}/images/mopc/logo.png`,
        url: origin,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name,
        alternateName,
        description: copy.description,
        url: origin,
        inLanguage: ["ar-EG", "en-EG"],
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
