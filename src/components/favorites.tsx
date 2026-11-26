"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { money, type Locale, type Product } from "@/lib/catalog";
import { PurchaseButtons } from "./purchase-buttons";
import { FavoriteButton, useFavorites } from "./favorite-button";

export function Favorites({ locale }: { locale: Locale }) {
  const ids = useFavorites();
  const [products, setProducts] = useState<(Product & { imageUrl?: string })[]>(
      [],
    ),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const signature = ids.join(",");
  useEffect(() => {
    if (!signature) {
      setProducts([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/products?ids=${encodeURIComponent(signature)}&locale=${locale}`,
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw Error();
        const data = await r.json();
        setProducts(data.products || []);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            locale === "ar"
              ? "مقدرناش نحمّل المنتجات. جرّب تاني."
              : "Unable to load favorites. Please try again.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [signature, locale]);
  return (
    <div className="shell section">
      <h1>{locale === "ar" ? "منتجاتك المفضلة" : "Your favorites"}</h1>
      {loading ? (
        <p role="status">
          {locale === "ar" ? "جارٍ تحميل المفضلة…" : "Loading favorites…"}
        </p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : products.length ? (
        <div className="product-grid">
          {products.map((p) => (
            <article className="product-card" key={p.id}>
              <FavoriteButton id={p.id} locale={locale} />
              <Link
                className="product-art"
                href={`/${locale}/products/${p.slug}`}
              >
                {p.imageUrl && <img src={p.imageUrl} alt={p.name[locale]} />}
              </Link>
              <div className="product-info">
                <h3>
                  <Link href={`/${locale}/products/${p.slug}`}>
                    {p.name[locale]}
                  </Link>
                </h3>
                <div className="product-price">
                  {money(p.sale ?? p.price, locale)}
                </div>
                <PurchaseButtons product={p} locale={locale} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel favorites-empty">
          <Heart size={48} />
          <h2>
            {locale === "ar"
              ? "احتفظ بالقطع اللي تهمك هنا"
              : "Save the parts you love here"}
          </h2>
          <p>
            {locale === "ar"
              ? "اضغط على علامة القلب بجانب أي منتج لإضافته إلى المفضلة."
              : "Tap the heart on any product to save it for later."}
          </p>
          <Link className="button" href={`/${locale}/catalog`}>
            {locale === "ar" ? "تصفح المنتجات" : "Browse products"}
          </Link>
        </div>
      )}
    </div>
  );
}
