"use client";
import { addCartItem } from "@/lib/cart";
import { partArt } from "@/lib/visuals";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  ShoppingBag,
  ArrowUpRight,
  Check,
  Plus,
  Minus,
  GitCompareArrows,
  X,
  Copy,
} from "lucide-react";
import type { Locale, Product, Vehicle } from "@/lib/catalog";
import { money } from "@/lib/catalog";
import { t } from "@/lib/i18n";
type CartLine = { id: string; qty: number };
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("store-change"));
}
export function Language({ locale }: { locale: Locale }) {
  const path = usePathname();
  const params = useSearchParams();
  return (
    <a
      lang={locale === "ar" ? "en" : "ar"}
      href={
        path.replace(/^\/(ar|en)/, locale === "ar" ? "/en" : "/ar") +
        (params.size ? "?" + params.toString() : "")
      }
    >
      {locale === "ar" ? "EN" : "العربية"}
    </a>
  );
}
export function SelectVehicle({
  vehicles,
  locale,
}: {
  vehicles: Vehicle[];
  locale: Locale;
}) {
  const [id, setId] = useState(vehicles[0]?.id ?? "");
  const router = useRouter();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        document.cookie = `vehicle=${encodeURIComponent(id)};path=/;max-age=2592000;SameSite=Lax`;
        await fetch("/api/garage-active", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicle: id }),
        }).catch(() => {});
        router.push(`/${locale}/catalog?vehicle=${encodeURIComponent(id)}`);
        router.refresh();
      }}
      className="panel stack"
    >
      <label htmlFor="configuration">
        {locale === "ar"
          ? "السنة والمحرك وتفاصيل السيارة"
          : "Year, engine & vehicle details"}
      </label>
      <select
        id="configuration"
        value={id}
        onChange={(e) => setId(e.target.value)}
      >
        {vehicles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name[locale]}
          </option>
        ))}
      </select>

      <button className="button">
        {t(locale).parts} <span>↗</span>
      </button>
    </form>
  );
}
export function ProductActions({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const router = useRouter();
  const [buying, setBuying] = useState(false);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="product-actions">
      <div className="quantity-row">
        <span className="quantity-label">{t(locale).quantity}</span>
        <div className="quantity">
          <button
            aria-label={locale === "ar" ? "تقليل الكمية" : "Decrease quantity"}
            onClick={() => setQty(Math.max(1, qty - 1))}
          >
            <Minus size={16} />
          </button>
          <output>{qty}</output>
          <button
            aria-label={locale === "ar" ? "زيادة الكمية" : "Increase quantity"}
            onClick={() => setQty(Math.min(99, qty + 1))}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      <button
        className="button product-add-to-cart"
        disabled={!product.orderable}
        data-analytics="add_to_cart"
        data-productid={product.id}
        onClick={() => {
          try {
            addCartItem(product.id, qty);
            setAdded(true);
          } catch {
            setMessage(t(locale).cartStorageError);
          }
        }}
      >
        {added ? <Check size={18} /> : <ShoppingBag size={18} />}{" "}
        {added
          ? locale === "ar"
            ? "أضيفت للسلة"
            : "Added to cart"
          : t(locale).add}
      </button>
      <button
        type="button"
        className="button product-buy-now"
        disabled={!product.orderable || buying}
        onClick={() => {
          try {
            addCartItem(product.id, qty, true);
            setBuying(true);
            router.push(`/${locale}/checkout`);
          } catch {
            setMessage(t(locale).cartStorageError);
          }
        }}
      >
        {buying ? t(locale).openingCheckout : t(locale).buyNow}
        <ArrowUpRight size={18} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="product-compare"
        onClick={() => {
          const list = read<{ id: string; family: string }[]>("compare", []);
          if (list.some((p) => p.family !== product.family)) {
            setMessage(
              locale === "ar"
                ? "قارن قطعاً من نفس العائلة فقط"
                : "Compare products from the same part family",
            );
            return;
          }
          if (!list.some((p) => p.id === product.id) && list.length < 4)
            list.push({ id: product.id, family: product.family });
          save("compare", list);
          setMessage(
            locale === "ar" ? "أضيفت للمقارنة" : "Added to comparison",
          );
        }}
      >
        <GitCompareArrows size={16} />
        {t(locale).compare}
      </button>
      <p className="product-actions-message" role="status">
        {message}
      </p>
    </div>
  );
}
export function CopyPart({
  value,
  locale = "en",
}: {
  value: string;
  locale?: Locale;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      aria-label={locale === "ar" ? "نسخ رقم القطعة" : "Copy part number"}
    >
      {value} {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
export function Cart({
  products: initialProducts,
  locale,
}: {
  products: Product[];
  locale: Locale;
}) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [products, setProducts] = useState(initialProducts);
  const [lines, setLines] = useState<CartLine[]>([]);
  useEffect(() => {
    const refresh = () => setLines(read("cart", []));
    refresh();
    window.addEventListener("store-change", refresh);
    return () => window.removeEventListener("store-change", refresh);
  }, []);
  useEffect(() => {
    if (!lines.length) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    const controller = new AbortController();
    fetch(
      "/api/products?ids=" +
        encodeURIComponent(lines.map((i) => i.id).join(",")) +
        "&locale=" +
        locale,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw Error("Unavailable");
        return r.json();
      })
      .then((data) => {
        setProducts(data.products);
        setLoading(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLoadError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [lines]);
  const update = (items: CartLine[]) => {
    setLines(items);
    save("cart", items);
  };
  const total = lines.reduce((sum, line) => {
    const p = products.find((p) => p.id === line.id);
    return sum + (p ? (p.sale ?? p.price) * line.qty : 0);
  }, 0);
  return (
    <div className="two-col">
      <div className="stack">
        {lines.length === 0 ? (
          <p>{t(locale).empty}</p>
        ) : (
          lines.map((line) => {
            const p = products.find((p) => p.id === line.id);
            return (
              <article className="cart-row panel" key={line.id}>
                <div>
                  <a href={p ? `/${locale}/products/${p.slug}` : undefined}>
                    {p?.name[locale] ??
                      (loading
                        ? locale === "ar"
                          ? "جار تحميل المنتج…"
                          : "Loading product…"
                        : locale === "ar"
                          ? "المنتج غير متاح — يرجى حذفه"
                          : "Product unavailable — please remove it")}
                  </a>
                  <p className="muted">
                    {p && money(p.sale ?? p.price, locale)}
                  </p>
                </div>
                <label>
                  {t(locale).quantity}
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={line.qty}
                    onChange={(e) =>
                      update(
                        lines.map((x) =>
                          x.id === line.id
                            ? {
                                ...x,
                                qty: Math.max(
                                  1,
                                  Math.min(99, Number(e.target.value) || 1),
                                ),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                </label>
                <button
                  aria-label={locale === "ar" ? "حذف القطعة" : "Remove item"}
                  onClick={() => update(lines.filter((x) => x.id !== line.id))}
                >
                  <X size={18} />
                </button>
              </article>
            );
          })
        )}
      </div>
      <aside className="panel stack">
        <h2>{t(locale).subtotal}</h2>
        {loadError && (
          <p role="alert">
            {locale === "ar"
              ? "تعذر تحميل السلة. أعد تحميل الصفحة."
              : "Could not load the cart. Please reload the page."}
          </p>
        )}
        <p className="price">{money(total, locale)}</p>
        <p className="muted">
          {locale === "ar"
            ? "يتم حساب التوصيل والخصم على الخادم عند الطلب."
            : "Delivery and discounts are calculated on the server at checkout."}
        </p>
        {!loading &&
          !loadError &&
          lines.length > 0 &&
          lines.every((line) =>
            products.some((p) => p.id === line.id && p.orderable),
          ) && (
            <a className="button" href={`/${locale}/checkout`}>
              {t(locale).checkout} ↗
            </a>
          )}
      </aside>
    </div>
  );
}
export function Compare({
  products: initialProducts,
  locale,
  fit,
}: {
  products: Product[];
  locale: Locale;
  fit: Record<string, string>;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [fitments, setFitments] = useState(fit);
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read<{ id: string }[]>("compare", []).map((p) => p.id));
  }, []);
  useEffect(() => {
    if (!ids.length) return;
    fetch(
      "/api/products?ids=" +
        encodeURIComponent(ids.join(",")) +
        "&locale=" +
        locale,
    )
      .then((r) => r.json())
      .then((data) => {
        setProducts(data.products ?? []);
        setFitments(data.fitments ?? {});
      })
      .catch(() => {});
  }, [ids]);
  const selected = products.filter((p) => ids.includes(p.id)).slice(0, 4);
  if (new Set(selected.map((p) => p.family)).size > 1)
    return (
      <div className="panel">
        <p>
          {locale === "ar"
            ? "يمكن مقارنة القطع من نفس العائلة فقط"
            : "Only products from the same part family can be compared."}
        </p>
        <button
          className="button"
          onClick={() => {
            save("compare", []);
            setIds([]);
          }}
        >
          {locale === "ar" ? "مسح المقارنة" : "Clear comparison"}
        </button>
      </div>
    );
  if (selected.length === 1)
    return (
      <section className="panel stack">
        <h2>
          {locale === "ar"
            ? "اختر قطعة ثانية للمقارنة"
            : "Choose a second product to compare"}
        </h2>
        <p>{selected[0].name[locale]}</p>
        <p>
          {locale === "ar"
            ? "تبدأ المقارنة عند اختيار قطعتين إلى أربع قطع من نفس العائلة."
            : "Comparison starts with 2–4 products from the same part family."}
        </p>
        <a
          className="button"
          href={`/${locale}/catalog?category=${encodeURIComponent(selected[0].category)}`}
        >
          {t(locale).catalog}
        </a>
        <button
          className="button secondary"
          onClick={() => {
            save("compare", []);
            setIds([]);
          }}
        >
          {locale === "ar" ? "مسح الاختيار" : "Clear selection"}
        </button>
      </section>
    );
  return (
    <>
      <p className="muted">
        {locale === "ar"
          ? "اختر ٢–٤ قطع من نفس العائلة للمقارنة."
          : "Select 2–4 products from one part family to compare."}
      </p>
      {selected.length === 1 && (
        <p className="notice">
          {locale === "ar"
            ? "أضف قطعة أخرى من نفس العائلة لبدء المقارنة"
            : "Add a second product from this family to start comparison."}
        </p>
      )}
      <div className="product-grid">
        {selected.map((p) => (
          <article className="panel stack" key={p.id}>
            <h2>{p.name[locale]}</h2>
            <p>
              {p.manufacturer} ·{" "}
              {p.type === "oem" ? "Original" : "After Market"}
            </p>
            <p className="price">{money(p.sale ?? p.price, locale)}</p>
            <p>{fitments[p.id]}</p>
            {Object.entries(p.specs).map(([key, value]) => (
              <p key={key} className="small">
                <span className="muted">{key}:</span> {value}
              </p>
            ))}
            <p>
              {p.warranty?.[locale] ??
                (locale === "ar"
                  ? "الضمان: غير موفر"
                  : "Warranty: not supplied")}
            </p>
            <a
              href={`/${locale}/products/${p.slug}`}
              className="button secondary"
            >
              {t(locale).view}
            </a>
            <button
              onClick={() => {
                const next = ids.filter((id) => id !== p.id);
                setIds(next);
                save(
                  "compare",
                  selected
                    .filter((x) => next.includes(x.id))
                    .map((x) => ({ id: x.id, family: x.family })),
                );
              }}
            >
              ×
            </button>
          </article>
        ))}
      </div>
      {!selected.length && (
        <a className="button" href={`/${locale}/catalog`}>
          {t(locale).catalog}
        </a>
      )}
    </>
  );
}
export function Gallery({
  locale,
  media = [],
  category = "filters",
  demo = true,
}: {
  locale: Locale;
  media?: { url: string; alt: { ar: string; en: string } }[];
  category?: string;
  demo?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const [touch, setTouch] = useState(0);
  const items = media.length
    ? media
    : [
        {
          url: partArt(category),
          alt: {
            ar: "رسم توضيحي تجريبي، ليس صورة للقطعة",
            en: "Demo illustration, not an actual part photograph",
          },
        },
      ];
  if (!media.length && !demo)
    return (
      <div className="product-art large">
        <p>
          {locale === "ar"
            ? "صورة المنتج غير متاحة"
            : "Product photo unavailable"}
        </p>
      </div>
    );
  const next = (direction: number) =>
    setIndex((index + direction + items.length) % items.length);
  return (
    <>
      <button
        className="product-art large"
        aria-label={locale === "ar" ? "تكبير الصورة" : "Enlarge image"}
        onClick={() => dialog.current?.showModal()}
      >
        <img src={items[index].url} alt={items[index].alt[locale]} />
        <span>
          {media.length
            ? locale === "ar"
              ? "＋ تكبير"
              : "＋ ZOOM"
            : locale === "ar"
              ? "رسم توضيحي تجريبي ＋"
              : "DEMO / ILLUSTRATION　＋"}
        </span>
      </button>
      {items.length > 1 && (
        <div className="gallery-thumbs">
          {items.map((item, i) => (
            <button
              key={item.url}
              aria-label={`${locale === "ar" ? "صورة" : "Image"} ${i + 1}`}
              aria-pressed={i === index}
              onClick={() => setIndex(i)}
            >
              <img src={item.url} alt={item.alt[locale]} />
            </button>
          ))}
        </div>
      )}
      <dialog
        ref={dialog}
        aria-label={
          locale === "ar" ? "صورة المنتج المكبرة" : "Enlarged product image"
        }
        className="lightbox"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") dialog.current?.close();
          if (e.key === "ArrowRight") next(1);
          if (e.key === "ArrowLeft") next(-1);
        }}
        onTouchStart={(e) => setTouch(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (Math.abs(e.changedTouches[0].clientX - touch) > 40)
            next(e.changedTouches[0].clientX < touch ? 1 : -1);
        }}
      >
        <button
          aria-label={locale === "ar" ? "إغلاق الصورة" : "Close enlarged image"}
          onClick={() => dialog.current?.close()}
        >
          <X />
        </button>
        <img src={items[index].url} alt={items[index].alt[locale]} />
        {items.length > 1 && (
          <div className="gallery-nav">
            <button
              aria-label={locale === "ar" ? "الصورة السابقة" : "Previous image"}
              onClick={() => next(-1)}
            >
              ←
            </button>
            <span>
              {index + 1} / {items.length}
            </span>
            <button
              aria-label={locale === "ar" ? "الصورة التالية" : "Next image"}
              onClick={() => next(1)}
            >
              →
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}

export function VehicleSync({ id }: { id?: string }) {
  useEffect(() => {
    if (id)
      document.cookie = `vehicle=${encodeURIComponent(id)};path=/;max-age=2592000;SameSite=Lax`;
  }, [id]);
  return null;
}

export function CartSync() {
  useEffect(() => {
    let active = true;
    let authenticated = false;
    const persist = () => {
      if (authenticated)
        fetch("/api/cart", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: read<CartLine[]>("cart", []) }),
        }).catch(() => {});
    };
    fetch("/api/cart")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data.authenticated) return;
        authenticated = true;
        const merged = read<CartLine[]>("cart", []);
        for (const server of data.items ?? []) {
          const local = merged.find((x) => x.id === server.id);
          if (local) local.qty = Math.max(local.qty, server.qty);
          else merged.push(server);
        }
        save("cart", merged);
        persist();
      })
      .catch(() => {});
    window.addEventListener("store-change", persist);
    return () => {
      active = false;
      window.removeEventListener("store-change", persist);
    };
  }, []);
  return null;
}

export function ClearVehicle({ locale }: { locale: Locale }) {
  return (
    <button
      className="small"
      onClick={() => {
        document.cookie = "vehicle=;path=/;max-age=0;SameSite=Lax";
        window.location.assign(`/${locale}/catalog`);
      }}
    >
      {locale === "ar" ? "إلغاء اختيار السيارة" : "Clear vehicle"}
    </button>
  );
}
export function MobileBuyBar({
  product,
  locale,
}: {
  product: Product;
  locale: Locale;
}) {
  const [added, setAdded] = useState(false);
  return (
    <div className="mobile-buy-bar">
      <span>{money(product.sale ?? product.price, locale)}</span>
      <button
        className="button"
        disabled={!product.orderable}
        data-analytics="add_to_cart"
        data-productid={product.id}
        onClick={() => {
          const lines = read<CartLine[]>("cart", []);
          const line = lines.find((l) => l.id === product.id);
          if (line) line.qty = Math.min(99, line.qty + 1);
          else lines.push({ id: product.id, qty: 1 });
          save("cart", lines);
          setAdded(true);
        }}
      >
        {added
          ? locale === "ar"
            ? "أضيفت للسلة"
            : "Added to cart"
          : t(locale).add}
      </button>
      <span className="sr-only" role="status">
        {added ? "Added / أضيفت" : ""}
      </span>
    </div>
  );
}
