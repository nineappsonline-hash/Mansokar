/** Pure helpers for product photo ordering; persistence happens on Save. */
export type ProductPhoto = { path: string; alt: { ar: string; en: string }; url: string };

export function moveProductPhoto<T>(images: readonly T[], from: number, to: number): T[] {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= images.length || to >= images.length) return [...images];
  const next = [...images];
  const [photo] = next.splice(from, 1);
  next.splice(to, 0, photo);
  return next;
}

export function validateProductPhotos(images: readonly ProductPhoto[]): string | null {
  if (images.length > 10) return "Maximum 10 photos per product";
  const paths = new Set<string>();
  for (const image of images) {
    if (!image.path.trim() || paths.has(image.path)) return "Duplicate or missing image path";
    paths.add(image.path);
    if (!image.alt.ar.trim() || !image.alt.en.trim()) return "Arabic and English image descriptions are required";
    if (image.alt.ar.length > 500 || image.alt.en.length > 500) return "Image descriptions cannot exceed 500 characters";
  }
  return null;
}
