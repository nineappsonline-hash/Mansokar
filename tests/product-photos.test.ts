import { test } from "node:test";
import assert from "node:assert/strict";
import { moveProductPhoto, validateProductPhotos } from "../src/lib/product-photo-order";

const photo = (path: string, ar = "صورة القطعة", en = "Spare part image") => ({
  path, alt: { ar, en }, url: "https://example.invalid/" + path,
});

test("product image cover selection is immutable and preserves other photos", () => {
  const original = [photo("a"), photo("b"), photo("c")];
  const reordered = moveProductPhoto(original, 2, 0);
  assert.deepEqual(reordered.map((p) => p.path), ["c", "a", "b"]);
  assert.deepEqual(original.map((p) => p.path), ["a", "b", "c"]);
  assert.deepEqual(moveProductPhoto(original, 1, 2).map((p) => p.path), ["a", "c", "b"]);
  assert.deepEqual(moveProductPhoto(original, 0, -1), original);
  assert.deepEqual(moveProductPhoto(original, 4, 0), original);
});

test("product images require unique paths and bilingual alt text", () => {
  assert.equal(validateProductPhotos([photo("a"), photo("b")]), null);
  assert.match(validateProductPhotos([photo("a"), photo("a")]) ?? "", /Duplicate/);
  assert.match(validateProductPhotos([photo("a", "", "English")]) ?? "", /descriptions/);
  assert.match(validateProductPhotos([photo("a", "عربي", " ")]) ?? "", /descriptions/);
  assert.match(validateProductPhotos(Array.from({ length: 11 }, (_, i) => photo(String(i)))) ?? "", /10/);
  assert.match(validateProductPhotos([photo("a", "عربي", "x".repeat(501))]) ?? "", /500/);
});
