export const uploadedImagePath = /^[a-f0-9-]+\.jpg$/;

export function isRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && Boolean(url.hostname) && !/\s/.test(value)
    );
  } catch {
    return false;
  }
}

export function isProductImagePath(value: string) {
  return uploadedImagePath.test(value) || isRemoteImageUrl(value);
}
