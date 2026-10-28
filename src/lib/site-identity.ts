export function siteIdentity(base: string, name: string) {
  const origin = new URL(base).origin;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name,
        url: origin,
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        name,
        url: origin,
        inLanguage: ["ar-EG", "en-EG"],
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
