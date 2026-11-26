"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { addCartItem } from "@/lib/cart";
import { partArt } from "@/lib/visuals";
import { money, type Locale, type Product, type Vehicle } from "@/lib/catalog";
import type { CarContext } from "@/lib/public-product";
import { t } from "@/lib/i18n";
import {
  ShoppingBag, ArrowUpRight, Check, Plus, Minus,
  GitCompareArrows, X, Copy,
} from "lucide-react";

type CartLine = { id: string; qty: number; make?: string; model?: string; year?: number };
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

export function ProductActions({
  product,
  locale,
  vehicle,
  context,
}: {
  product: Pick<Product, "id" | "orderable" | "family">;
  locale: Locale;
  vehicle?: Vehicle;
  context?: CarContext;
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
            addCartItem(
              product.id,
              qty,
              false,
              vehicle
                ? {
                    make: vehicle.brand,
                    model: vehicle.model,
                    year: vehicle.year,
                  }
                : context
                  ? {
                      make: context.make,
                      model: context.model,
                      year: context.year,
                    }
                  : undefined,
            );
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
            addCartItem(
              product.id,
              qty,
              true,
              vehicle
                ? {
                    make: vehicle.brand,
                    model: vehicle.model,
                    year: vehicle.year,
                  }
                : context
                  ? {
                      make: context.make,
                      model: context.model,
                      year: context.year,
                    }
                  : undefined,
            );
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
  const [zoomOpen, setZoomOpen] = useState(false);
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
        <img
          src="/images/part-placeholder.svg"
          width={800}
          height={600}
          alt={
            locale === "ar"
              ? "صورة توضيحية عامة؛ صورة المنتج غير متاحة"
              : "Generic placeholder; product photo unavailable"
          }
        />
      </div>
    );
  const next = (direction: number) =>
    setIndex((index + direction + items.length) % items.length);
  return (
    <>
      <button
        className="product-art large"
        aria-label={locale === "ar" ? "تكبير الصورة" : "Enlarge image"}
        onClick={() => {
          setZoomOpen(true);
          dialog.current?.showModal();
        }}
      >
        <img
          src={items[index].url}
          alt={items[index].alt[locale]}
          width={800}
          height={600}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />
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
              {/^\\/product-media\\/[0-9a-f-]{36}$/i.test(item.url) ? (
                <Image
                  src={item.url}
                  alt={item.alt[locale]}
                  width={96}
                  height={72}
                  sizes="54px"
                  loading="lazy"
                />
              ) : (
                <img
                  src={item.url}
                  alt={item.alt[locale]}
                  width={96}
                  height={72}
                  loading="lazy"
                  decoding="async"
                />
              )}
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
        onClose={() => setZoomOpen(false)}
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
        {zoomOpen && (
          <img
            src={items[index].url}
            alt={items[index].alt[locale]}
            width={1200}
            height={900}
            decoding="async"
          />
        )}
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

export function MobileBuyBar({
  product,
  locale,
}: {
  product: Pick<Product, "id" | "orderable" | "price" | "sale">;
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
