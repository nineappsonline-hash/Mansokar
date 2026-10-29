import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
const base = process.env.BASE_URL || "http://localhost:3104";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const run = randomUUID(),
  make = `qa-photo-${run}`,
  modelId = `${make}-test`,
  makeName = `QA Make ${run}`;
const makeSlot = `brand-${make}-photo`,
  modelSlot = `model-${make}-test`;
let user, browser;
const paths = new Set();
const check = async (query) => {
  const result = await query;
  if (result.error) throw Error(result.error.message);
  return result.data;
};
try {
  await check(db.from("vehicle_brands").insert({ slug: make, name: makeName }));
  await check(
    db
      .from("vehicle_models")
      .insert({
        id: modelId,
        brand: make,
        slug: "test",
        name: { en: "QA Vehicle", ar: "سيارة اختبار" },
      }),
  );
  const password = randomUUID() + "Aa1!",
    email = `vehicle-photo-${run}@example.invalid`;
  const created = await check(
    db.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  user = created.user;
  await check(db.from("admins").insert({ user_id: user.id, enabled: true }));
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(base + "/admin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  await page.goto(`${base}/admin?module=vehicles&id=${modelId}`);
  const model = page.getByRole("region", {
    name: "Car model photo",
    exact: true,
  });
  const makePhoto = page.getByRole("region", {
    name: "Car make photo",
    exact: true,
  });
  const photo = await sharp({
    create: { width: 600, height: 400, channels: 3, background: "#46667d" },
  })
    .png()
    .toBuffer();
  await model
    .locator('input[type="file"]')
    .setInputFiles({
      name: "vehicle.png",
      mimeType: "image/png",
      buffer: photo,
    });
  await model
    .getByText("Photo saved. It is now used on the storefront.")
    .waitFor();
  let record = await check(
    db.from("site_media").select("path").eq("slot", modelSlot).single(),
  );
  paths.add(record.path);
  const modelPath = record.path;
  await makePhoto.locator("[aria-busy]").evaluate((el, bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(
      new File([new Uint8Array(bytes)], "make.png", { type: "image/png" }),
    );
    el.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: transfer,
      }),
    );
  }, Array.from(photo));
  await makePhoto
    .getByText("Photo saved. It is now used on the storefront.")
    .waitFor();
  record = await check(
    db.from("site_media").select("path").eq("slot", makeSlot).single(),
  );
  paths.add(record.path);
  await page.reload();
  await model.locator("img").waitFor();
  assert.ok(
    (await model.locator("img").getAttribute("src")).includes(modelPath),
  );
  await page.goto(`${base}/en/brands/${make}`);
  const image = page.locator(".model-card img").first();
  await image.waitFor();
  assert.ok(
    (await image.getAttribute("src")).includes(modelPath),
    "Uploaded model photo must be used on storefront",
  );
  await page.goto(`${base}/admin?module=vehicles&id=${modelId}`);
  await page.setViewportSize({ width: 390, height: 900 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  );
  await model
    .getByRole("button", { name: "Remove uploaded photo / restore default" })
    .click();
  await model.getByText("Default photo restored.").waitFor();
  assert.equal(
    (await check(db.from("site_media").select("slot").eq("slot", modelSlot)))
      .length,
    0,
  );
  console.log(
    "Vehicle model browse upload, make drag/drop upload, persisted preview, public model image, mobile layout and restore-default passed.",
  );
} finally {
  await browser?.close();
  const leftovers = await db
    .from("site_media")
    .select("path")
    .in("slot", [makeSlot, modelSlot]);
  for (const row of leftovers.data || []) paths.add(row.path);
  await db.from("site_media").delete().in("slot", [makeSlot, modelSlot]);
  if (paths.size) await db.storage.from("catalog-images").remove([...paths]);
  await db.from("vehicle_models").delete().eq("id", modelId);
  await db.from("vehicle_brands").delete().eq("slug", make);
  if (user) {
    await db.from("admin_audit_logs").delete().eq("user_id", user.id);
    await db.from("admins").delete().eq("user_id", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
}
