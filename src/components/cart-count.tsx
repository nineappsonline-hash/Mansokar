"use client";
import { useEffect, useState } from "react";

/**
 * Cart badge is used on every storefront page.
 * Keep it separate from the full favorites page, which includes product
 * listings and purchase controls that shouldn't ship with the header.
 */
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
