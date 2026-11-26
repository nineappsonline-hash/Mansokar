"use client";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import type { Locale } from "@/lib/catalog";

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
export function useFavorites() {
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
                ? "مقدرناش نحفظ المفضلة على الجهاز ده"
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
