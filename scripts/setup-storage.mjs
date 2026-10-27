import { createClient } from "@supabase/supabase-js";
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
  throw Error("Server environment required");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
const { data, error } = await db.storage.listBuckets();
if (error) throw error;
for (const id of ["inquiry-images", "catalog-images"]) {
  if (data.some((b) => b.id === id)) {
    const { error } = await db.storage.updateBucket(id, {
      public: false,
      fileSizeLimit: 5_000_000,
      allowedMimeTypes: ["image/jpeg"],
    });
    if (error) throw error;
    console.log(id + " private settings verified.");
    continue;
  }
  const { error } = await db.storage.createBucket(id, {
    public: false,
    fileSizeLimit: 5_000_000,
    allowedMimeTypes: ["image/jpeg"],
  });
  if (error) throw error;
  console.log(id + " private bucket created.");
}
