"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { money, type Locale, type Product } from "@/lib/catalog";
import { PurchaseButtons } from "./purchase-buttons";
const event = "mopc-favorites-change",
  key = "mopc-favorites";
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === "string" && /^[-_a-zA-Z0-9]{1,100}$/.test(id),
            ),
          ),
        ].slice(0, 40)
      : [];
  } catch {
    return [];
  }
}
function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    const update = () => setIds(read());
    update();
    window.addEventListener(event, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(event, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return ids;
}
export function FavoriteButton({ id, locale }: { id: string; locale: Locale }) {
  const ids = useFavorites(),
    saved = ids.includes(id);
  const [message, setMessage] = useState("");
  return (
    <>
      <button
        className="favorite-toggle"
        type="button"
        aria-pressed={saved}
        aria-label={
          locale === "ar"
            ? saved
              ? "إزالة من المفضلة"
              : "أضف للمفضلة"
            : saved
              ? "Remove from favorites"
              : "Save to favorites"
        }
        onClick={() => {
          const current = read();
          if (!current.includes(id) && current.length >= 40) {
            setMessage(
              locale === "ar"
                ? "المفضلة تتسع لـ ٤٠ منتجًا"
                : "You can save up to 40 favorites",
            );
            return;
          }
          try {
            localStorage.setItem(
              key,
              JSON.stringify(
                current.includes(id)
                  ? current.filter((v) => v !== id)
                  : [...current, id],
              ),
            );
            window.dispatchEvent(new Event(event));
            setMessage("");
          } catch {
            setMessage(
              locale === "ar"
                ? "تعذر حفظ المفضلة على هذا الجهاز"
                : "Favorites could not be saved on this device",
            );
          }
        }}
      >
        <Heart size={22} fill={saved ? "currentColor" : "none"} />
      </button>
      <span className="sr-only" role="status">
        {message}
      </span>
    </>
  );
}
export function CartCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () => {
      try {
        const rows = JSON.parse(localStorage.getItem("cart") || "[]");
        setCount(
          Array.isArray(rows)
            ? rows.reduce(
                (n, r) =>
                  n +
                  (Number.isInteger(r?.qty) && r.qty > 0
                    ? Math.min(99, r.qty)
                    : 0),
                0,
              )
            : 0,
        );
      } catch {
        setCount(0);
      }
    };
    update();
    window.addEventListener("store-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("store-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return count > 0 ? <span className="cart-count">{count}</span> : null;
}
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
              ? "تعذر تحميل المنتجات. حاول مرة أخرى."
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
