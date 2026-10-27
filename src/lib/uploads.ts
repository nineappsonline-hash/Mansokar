import sharp from "sharp";
export async function sanitizeImage(input: Buffer) {
  if (input.length > 5_000_000) throw Error("Maximum image size is 5 MB");
  const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
  const png = input
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp =
    input.subarray(0, 4).toString() === "RIFF" &&
    input.subarray(8, 12).toString() === "WEBP";
  if (!jpeg && !png && !webp) throw Error("Use a JPEG, PNG or WebP image");
  return sharp(input, { limitInputPixels: 25_000_000, animated: false })
    .rotate()
    .resize({
      width: 1600,
      height: 1600,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
}
