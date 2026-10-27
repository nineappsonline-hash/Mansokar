import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
assert.ok(process.env.CRON_SECRET && process.env.BASE_URL);
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const oldToken = randomUUID(),
  recentToken = randomUUID();
const oldPath = randomUUID() + ".jpg",
  recentPath = randomUUID() + ".jpg";
const check = async (p) => {
  const r = await p;
  if (r.error) throw Error(r.error.message);
  return r.data;
};
try {
  const jpeg = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#ffbb00" },
  })
    .jpeg()
    .toBuffer();
  for (const path of [oldPath, recentPath])
    await check(
      db.storage
        .from("inquiry-images")
        .upload(path, jpeg, { contentType: "image/jpeg" }),
    );
  await check(
    db.from("pending_uploads").insert([
      {
        token: oldToken,
        path: oldPath,
        claimed: false,
        created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
      },
      {
        token: recentToken,
        path: recentPath,
        claimed: false,
        created_at: new Date().toISOString(),
      },
    ]),
  );
  const url = process.env.BASE_URL + "/api/maintenance";
  assert.equal((await fetch(url)).status, 401);
  const headers = { authorization: "Bearer " + process.env.CRON_SECRET };
  const preview = await fetch(url + "?dryRun=1", { headers });
  assert.equal(preview.status, 200);
  assert.ok((await preview.json()).expiredUploadCandidates >= 1);
  assert.equal(
    (
      await check(
        db.from("pending_uploads").select("token").eq("token", oldToken),
      )
    ).length,
    1,
  );
  const applied = await fetch(url, { headers });
  assert.equal(applied.status, 200);
  assert.ok((await applied.json()).removedUploads >= 1);
  assert.equal(
    (
      await check(
        db.from("pending_uploads").select("token").eq("token", oldToken),
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await check(
        db.from("pending_uploads").select("token").eq("token", recentToken),
      )
    ).length,
    1,
  );
  assert.ok((await db.storage.from("inquiry-images").download(oldPath)).error);
  assert.equal(
    (await db.storage.from("inquiry-images").download(recentPath)).error,
    null,
  );
  console.log(
    "Live maintenance passed: unauthorized denied, dry run preserved data, expired unclaimed upload removed, recent upload preserved.",
  );
} finally {
  await db
    .from("pending_uploads")
    .delete()
    .in("token", [oldToken, recentToken]);
  await db.storage.from("inquiry-images").remove([oldPath, recentPath]);
}
