import originals from "./vehicle-assets.json";
import showcase from "./vehicle-showcase-assets.json";
const images = { ...originals, ...showcase };
export function modelPhoto(key: string) {
  return (images as Record<string, { path: string; title: string }>)[key]?.path;
}

export function partArt(category: string) {
  return `/images/${["brakes", "ignition", "cooling"].includes(category) ? category : "part"}.svg`;
}
