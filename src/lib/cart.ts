export type CartItem = { id: string; qty: number };
/** Buy now ensures the chosen quantity is present without doubling an existing line. */
export function addCartItem(id: string, quantity = 1, ensureQuantity = false) {
  const qty = Math.max(1, Math.min(99, Math.trunc(quantity) || 1));
  let parsed: unknown;
  try {
    parsed = JSON.parse(localStorage.getItem("cart") ?? "[]");
  } catch {
    parsed = [];
  }
  const items: CartItem[] = Array.isArray(parsed)
    ? parsed.filter(
        (item): item is CartItem =>
          !!item &&
          typeof item.id === "string" &&
          Number.isInteger(item.qty) &&
          item.qty > 0 &&
          item.qty <= 99,
      )
    : [];
  const existing = items.find((item) => item.id === id);
  if (existing)
    existing.qty = ensureQuantity
      ? Math.max(existing.qty, qty)
      : Math.min(99, existing.qty + qty);
  else items.push({ id, qty });
  localStorage.setItem("cart", JSON.stringify(items));
  window.dispatchEvent(new Event("store-change"));
  return items;
}
