import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/catalog";
export function BrandCard({
  brand,
  locale,
  photo,
  logo,
}: {
  brand: { slug: string; name: string; ar: string };
  locale: Locale;
  photo?: string;
  logo?: string;
}) {
  const emblemSrc =
    logo ??
    (brand.slug === "citroen"
      ? "/images/brands/citroen-2022.svg"
      : `/images/brands/${brand.slug}.svg`);

  return (
    <Link
      href={`/${locale}/brands/${brand.slug}`}
      className={`brand-card cinematic-brand brand-${brand.slug}`}
      aria-label={
        locale === "ar"
          ? `تصفح قطع غيار ${brand.ar}`
          : `Shop ${brand.name} parts`
      }
    >
      {(photo || brand.slug !== "chevrolet") && (
        <Image
          className="brand-closeup"
          src={photo ?? `/images/cinematic/${brand.slug}-v2.webp`}
          alt=""
          fill
          sizes="(max-width:600px) 50vw, 25vw"
        />
      )}
      <div className="brand-card-shade" />
      <div className="brand-identity">
        {(logo || brand.slug !== "chevrolet") && (
          <img
            className="manufacturer-emblem"
            src={emblemSrc}
            alt={brand.name}
          />
        )}
        <span className="brand-wordmark" lang="en" dir="ltr">
          {brand.name.toUpperCase()}
        </span>
        <h3>
          {locale === "ar" ? `قطع غيار ${brand.ar}` : `${brand.name} parts`}
        </h3>
        <span className="brand-card-arrow" aria-hidden="true">
          <ArrowRight size={16} />
        </span>
      </div>
    </Link>
  );
}
