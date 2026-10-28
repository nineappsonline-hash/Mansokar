import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
import sharp from "sharp";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
assert.ok(process.env.BASE_URL);
const base = process.env.BASE_URL;
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = async (p) => {
  const r = await p;
  if (r.error) throw Error(r.error.message);
  return r.data;
};
const existing = await check(db.from("hero_slides").select("id"));
assert.equal(
  existing.length,
  0,
  "This write test requires an unused slideshow; run against staging when merchant slides exist.",
);
const original = await check(
  db
    .from("site_settings")
    .select("value")
    .eq("key", "hero_slideshow")
    .maybeSingle(),
);
const run = randomUUID(),
  email = `mansokar-qa-hero-${run}@example.invalid`,
  password = randomUUID() + "aA1!";
let user, browser;
let paths = [];
try {
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  user = created.data.user;
  await check(db.from("admins").insert({ user_id: user.id, enabled: true }));
  const unauthorized = await fetch(base + "/api/admin-hero-slides", {
    method: "POST",
    headers: { origin: base, "content-type": "application/json" },
    body: "{}",
  });
  assert.equal(unauthorized.status, 401);
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(20000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(base + "/en/account");
  const login = await page.evaluate(
    async ({ email, password }) => {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode: "login", locale: "en" }),
      });
      return r.status;
    },
    { email, password },
  );
  assert.equal(login, 200);
  await page.goto(base + "/admin?module=hero-slideshow");
  await page
    .getByRole("heading", { name: "Homepage hero slideshow", exact: true })
    .waitFor();
  const files = [];
  for (const [name, color] of [
    ["one.jpg", "#143e68"],
    ["two.jpg", "#702112"],
  ])
    files.push({
      name,
      mimeType: "image/jpeg",
      buffer: await sharp({
        create: { width: 320, height: 180, channels: 3, background: color },
      })
        .jpeg()
        .toBuffer(),
    });
  await page
    .getByLabel("Upload slideshow images", { exact: true })
    .setInputFiles(files);
  await page.getByRole("heading", { name: "Slide 2", exact: true }).waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#hero-uploads").disabled,
  );
  paths = await page
    .locator("article img")
    .evaluateAll((images) =>
      images.map((img) => new URL(img.src).pathname.split("/").at(-1)),
    );
  assert.equal(paths.length, 2);
  for (let i = 1; i <= 2; i++) {
    await page
      .getByLabel(`Slide ${i} description · en`, { exact: true })
      .fill("QA slide " + i);
    await page
      .getByLabel(`Slide ${i} description · ar`, { exact: true })
      .fill("شريحة اختبار " + i);
    await page.getByLabel("Enable slide " + i, { exact: true }).uncheck();
  }
  await page
    .getByLabel("Seconds between images (3–30)", { exact: true })
    .fill("3");
  const save = async () => {
    const [response] = await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin-hero-slides") &&
          r.request().method() === "POST",
      ),
      page
        .getByRole("button", { name: "Save hero slideshow", exact: true })
        .click(),
    ]);
    assert.equal(response.status(), 200, await response.text());
  };
  await save();
  let saved = await check(
    db.from("hero_slides").select("id,path,enabled,position").order("position"),
  );
  assert.deepEqual(
    saved.map((s) => s.enabled),
    [false, false],
  );
  assert.deepEqual(
    saved.map((s) => s.path),
    paths,
  );
  const home = await page.request.get(base + "/en");
  const html = await home.text();
  assert.ok(
    paths.every((path) => !html.includes(path)),
    "Disabled QA slides must not be published",
  );
  await page.getByLabel("Enable slide 1", { exact: true }).check();
  await page.getByLabel("Enable slide 2", { exact: true }).check();
  const preview = page.locator(".hero-slideshow-preview");
  const active = () =>
    preview.locator(".hero-slide.is-active").getAttribute("data-slide-index");
  await preview
    .getByRole("button", { name: "Next slide", exact: true })
    .click();
  assert.equal(await active(), "1");
  await page.waitForTimeout(3300);
  assert.equal(await active(), "1", "Focus should pause rotation");
  await preview
    .getByRole("button", { name: "Show slide 1", exact: true })
    .click();
  assert.equal(await active(), "0");
  await preview
    .getByRole("button", { name: "Pause slideshow", exact: true })
    .click();
  await page
    .getByLabel("Seconds between images (3–30)", { exact: true })
    .focus();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(3300);
  assert.equal(
    await active(),
    "0",
    "Explicit pause should persist outside the carousel",
  );
  await preview
    .getByRole("button", { name: "Play slideshow", exact: true })
    .click();
  await page
    .getByLabel("Seconds between images (3–30)", { exact: true })
    .focus();
  await page.mouse.move(0, 0);
  await page.waitForFunction(
    () =>
      document
        .querySelector(".hero-slideshow-preview .hero-slide.is-active")
        ?.getAttribute("data-slide-index") === "1",
    {},
    { timeout: 6000 },
  );
  await preview.hover();
  await page.waitForTimeout(3300);
  assert.equal(await active(), "1", "Hover should pause rotation");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(0, 0);
  await page
    .getByLabel("Seconds between images (3–30)", { exact: true })
    .focus();
  await page.waitForTimeout(3300);
  assert.equal(
    await active(),
    "1",
    "Reduced-motion preference should prevent automatic rotation",
  );
  await preview
    .getByRole("button", { name: "Next slide", exact: true })
    .click();
  assert.equal(await active(), "0");
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(
    await preview.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    true,
  );
  await page.getByLabel("Enable slide 1", { exact: true }).uncheck();
  await page.getByLabel("Enable slide 2", { exact: true }).uncheck();
  await page
    .getByRole("button", { name: "Move slide 2 earlier", exact: true })
    .click();
  await save();
  saved = await check(db.from("hero_slides").select("path").order("position"));
  assert.deepEqual(
    saved.map((s) => s.path),
    [...paths].reverse(),
  );
  await page
    .getByRole("button", { name: "Remove slide 1", exact: true })
    .click();
  await save();
  assert.equal((await check(db.from("hero_slides").select("id"))).length, 1);
  console.log(
    "Hero slideshow passed: protected writes, multiple uploads, descriptions, disabled-slide privacy, ordering/removal, manual/automatic rotation, pause/focus/hover, reduced motion and mobile preview.",
  );
} finally {
  await browser?.close();
  if (paths.length) {
    await db.from("hero_slides").delete().in("path", paths);
    await db.storage.from("catalog-images").remove(paths);
  }
  if (original)
    await db
      .from("site_settings")
      .upsert({ key: "hero_slideshow", value: original.value });
  else await db.from("site_settings").delete().eq("key", "hero_slideshow");
  if (user) {
    await db.from("admin_audit_logs").delete().eq("user_id", user.id);
    await db.from("admins").delete().eq("user_id", user.id);
    await db.from("member_carts").delete().eq("user_id", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
}
