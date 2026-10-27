import images from "./vehicle-assets.json";
export function modelPhoto(key: string) {
  return (images as Record<string, { path: string; title: string }>)[key]?.path;
}

export function partArt(category: string) {
  return `/images/${["brakes", "ignition", "cooling"].includes(category) ? category : "part"}.svg`;
}
