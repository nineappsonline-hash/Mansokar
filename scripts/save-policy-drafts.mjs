import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
const drafts = JSON.parse(
  await readFile(
    new URL("../docs/policies/drafts.json", import.meta.url),
    "utf8",
  ),
);
for (const draft of drafts) {
  if (
    !/^policies\/(shipping|returns|warranty)$/.test(draft.slug) ||
    draft.published !== false ||
    !draft.title.ar ||
    !draft.title.en ||
    !draft.body.ar ||
    !draft.body.en ||
    Math.max(draft.body.ar.length, draft.body.en.length) > 20000
  )
    throw Error("Invalid policy draft");
}
if (!process.argv.includes("--save-drafts")) {
  console.log("Preview only. Drafts:", drafts.map((p) => p.slug).join(", "));
} else {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    throw Error("Server database configuration required");
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  if (process.argv.includes("--update-drafts")) {
    for (const draft of drafts) {
      const updated = await db
        .from("cms_pages")
        .update(draft)
        .eq("slug", draft.slug)
        .eq("published", false)
        .select("slug");
      if (updated.error) throw Error(updated.error.message);
      if (!updated.data.length)
        throw Error(`Unpublished draft not found: ${draft.slug}`);
    }
  }
  // Ignore conflicts so a repeat run cannot replace reviewed merchant content.
  const saved = await db
    .from("cms_pages")
    .upsert(drafts, { onConflict: "slug", ignoreDuplicates: true })
    .select("slug,published");
  if (saved.error) throw Error(saved.error.message);
  console.log(
    "Created unpublished drafts:",
    saved.data.map((p) => p.slug).join(", ") ||
      "none; existing pages preserved",
  );
  const verified = await db
    .from("cms_pages")
    .select("slug,title,body,published")
    .in(
      "slug",
      drafts.map((p) => p.slug),
    );
  if (verified.error) throw Error(verified.error.message);
  if (verified.data.length !== drafts.length)
    throw Error("Not all policy pages are present");
  for (const page of verified.data)
    console.log(
      `${page.slug}: ${page.published ? "existing published page preserved" : "draft available in Admin → CMS"}`,
    );
}
