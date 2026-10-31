"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Check, ArrowUpRight } from "lucide-react";
import { addCartItem } from "@/lib/cart";
import type { Locale, Product } from "@/lib/catalog";
import { CarContext } from "@/lib/public-product";
import { t } from "@/lib/i18n";
export function PurchaseButtons({
  product,
  locale,
  quantity = 1,
  vehicle,
  context,
}: {
  product: Pick<Product, "id" | "name" | "orderable">;
  locale: Locale;
  quantity?: number;
  vehicle?: { make?: string; model?: string; year?: number };
  context?: CarContext;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState("");
  const w = t(locale);
  function purchase(buyNow: boolean) {
    if (!product.orderable || buying) return;
    try {
      setError("");
      const cartVehicle = vehicle ?? (context ? { make: context.make, model: context.model, year: context.year } : undefined);
      addCartItem(product.id, quantity, buyNow, cartVehicle);
      if (buyNow) {
        setBuying(true);
        router.push(`/${locale}/checkout`);
      } else setAdded(true);
    } catch {
      setBuying(false);
      setError(w.cartStorageError);
    }
  }
  return (
    <div className="purchase-controls">
      <div className="purchase-buttons">
        <button
          type="button"
          className="button purchase-add"
          disabled={!product.orderable || buying}
          aria-label={`${added ? w.addedToCart : w.add}: ${product.name[locale]}`}
          data-analytics="add_to_cart"
          data-productid={product.id}
          onClick={() => purchase(false)}
        >
          {added ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <ShoppingBag size={18} aria-hidden="true" />
          )}
          <span>{added ? w.addedToCart : w.add}</span>
        </button>
        <button
          type="button"
          className="button secondary purchase-buy"
          disabled={!product.orderable || buying}
          aria-label={`${buying ? w.openingCheckout : w.buyNow}: ${product.name[locale]}`}
          onClick={() => purchase(true)}
        >
          <span>{buying ? w.openingCheckout : w.buyNow}</span>
          <ArrowUpRight size={18} aria-hidden="true" />
        </button>
      </div>
      <span
        className={error ? "purchase-error" : "sr-only"}
        role="status"
        aria-live="polite"
      >
        {error || (added ? `${w.addedToCart}: ${product.name[locale]}` : "")}
      </span>
    </div>
  );
}
