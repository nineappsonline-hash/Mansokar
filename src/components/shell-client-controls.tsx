"use client";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Locale } from "@/lib/catalog";

type CartLine = {
  id: string;
  qty: number;
  make?: string;
  model?: string;
  year?: number;
};
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

/** Keep shared navigation and persistence lightweight. Product/checkout
 * interactions live in controls.tsx and are not needed in this client chunk. */
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
      {locale === "ar" ? "إلغاء اختيار العربية" : "Clear vehicle"}
    </button>
  );
}
