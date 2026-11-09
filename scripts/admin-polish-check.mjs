// Uses only disposable QA records; always removes them and never stores credentials.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import sharp from "sharp";
import ExcelJS from "exceljs";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
const base = process.env.BASE_URL || "http://localhost:3114";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = async (q) => {
  const r = await q;
  if (r.error) throw r.error;
  return r.data;
};
const run = crypto.randomUUID(),
  coupon = "QA_" + run.replaceAll("-", "").slice(0, 18).toUpperCase(),
  inquiry = crypto.randomUUID();
const users = [];
let browser, campaignId, productId;
const photoPaths = new Set();
try {
  browser = await chromium.launch();
  const create = async (admin) => {
    const password = crypto.randomUUID() + "Aa1!",
      email = `qa-admin-polish-${crypto.randomUUID()}@example.invalid`;
    const data = await check(
      db.auth.admin.createUser({ email, password, email_confirm: true }),
    );
    users.push(data.user.id);
    if (admin)
      await check(
        db.from("admins").insert({ user_id: data.user.id, enabled: true }),
      );
    return { id: data.user.id, email, password };
  };
  const admin = await create(true);
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(20000);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  const login = await page.request.post(base + "/api/auth", {
    headers: { origin: base },
    data: {
      email: admin.email,
      password: admin.password,
      mode: "login",
      destination: "admin",
      locale: "en",
    },
  });
  assert.equal(login.status(), 200);
  const modules = [
    "overview",
    "products",
    "vehicles",
    "recommendations",
    "orders",
    "inquiries",
    "customers",
    "campaigns",
    "promotions",
    "shipping",
    "cms",
    "branding",
    "hero-slideshow",
    "reports",
    "analytics",
    "seo",
    "settings",
  ];
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const module of modules) {
      const r = await page.goto(`${base}/admin?module=${module}`);
      assert.equal(r.status(), 200);
      await page.getByRole("link", { name: "View storefront" }).waitFor();
      assert.ok(
        await page.getByRole("link", { name: "View storefront" }).count(),
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${module} overflows at ${width}`,
      );
      if (
        width === 390 &&
        ["products", "vehicles", "settings"].includes(module)
      )
        await page.screenshot({
          path: `/tmp/admin-polished-${module}-mobile.png`,
          fullPage: true,
        });
    }
    console.log(`All 17 sections load and fit at ${width}px`);
  }
  await page.goto(base + "/admin?module=does-not-exist");
  await page.waitForURL(base + "/admin");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .getAttribute("aria-expanded"),
    "false",
  );
  assert.notEqual(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page.getByLabel("Find an admin section").fill("xyz-no-section");
  await page
    .getByRole("status")
    .filter({ hasText: "No sections match" })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/admin?module=products");
  await page.getByLabel("Spare part name · en").fill("Unsaved QA part");
  await page.getByRole("button", { name: "Cars & years", exact: true }).click();
  await page.waitForURL("**tab=vehicles");
  await page
    .getByRole("button", { name: "Product details", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Spare part name · en").inputValue(),
    "Unsaved QA part",
  );
  await page
    .getByRole("button", { name: "Excel import & export", exact: true })
    .click();
  await page.waitForURL("**view=excel");
  await page.reload();
  await page
    .getByRole("heading", {
      name: "Import and export products with Excel",
      exact: true,
    })
    .waitFor();
  // Create and remove a draft only; never publish QA products or change vehicle years.
  await page.goto(base + "/admin?module=products");
  const makers = await check(db.from("manufacturers").select("name").limit(1));
  assert.ok(makers.length);
  await page.getByLabel("Spare part name · en").fill("QA audit part " + run);
  await page.getByLabel("Spare part name · ar").fill("قطعة اختبار مؤقتة");
  await page.getByLabel("Item brand — search or select").fill(makers[0].name);
  await page.getByLabel("Part number", { exact: true }).fill("QA-" + run);
  await page.getByLabel("Sale price · EGP", { exact: true }).fill("100");
  await page.getByLabel("Cost price · EGP", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page.waitForURL("**module=products&id=**");
  productId = new URL(page.url()).searchParams.get("id");
  const draft = await check(
    db
      .from("products")
      .select("sku,status,price,cost")
      .eq("id", productId)
      .single(),
  );
  assert.ok(draft.sku);
  assert.equal(draft.status, "draft");
  assert.equal(draft.price, 10000);
  assert.equal(draft.cost, 5000);
  await page.getByRole("button", { name: "Photos", exact: true }).click();
  await page
    .getByRole("heading", { name: "Product photos", exact: true })
    .waitFor();
  const photo = await sharp({
    create: { width: 80, height: 80, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  const upload = page.waitForResponse(
    (r) =>
      r.url().includes("/api/upload?kind=catalog") &&
      r.request().method() === "POST",
  );
  await page.getByLabel("Upload product photo", { exact: true }).setInputFiles({
    name: "qa-photo.png",
    mimeType: "image/png",
    buffer: photo,
  });
  const uploaded = await upload;
  assert.equal(uploaded.status(), 200);
  const media = await uploaded.json();
  photoPaths.add(media.path);
  await page
    .getByLabel("Image description · en", { exact: true })
    .fill("Temporary QA image");
  await page
    .getByLabel("Image description · ar", { exact: true })
    .fill("صورة اختبار مؤقتة");
  const saveImage = page.waitForResponse(
    (r) =>
      r.url() === base + "/api/admin-images" && r.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Save image order and descriptions",
      exact: true,
    })
    .click();
  assert.equal((await saveImage).status(), 200);
  const pictures = await check(
    db.from("product_images").select("path").eq("product_id", productId),
  );
  assert.equal(pictures.length, 1);
  const template = await page.request.get(
    base + "/api/admin-export?format=xlsx&template=true",
  );
  assert.equal(template.status(), 200);
  assert.match(template.headers()["content-disposition"], /mopc-products/);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await template.body());
  assert.ok(book.getWorksheet("Products"));
  assert.ok(
    book.worksheets.find((s) => s.name.startsWith("Examples")).rowCount > 1,
  );
  assert.ok(book.getWorksheet("Instructions"));
  await page
    .getByRole("button", { name: "Delete product", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirm delete", exact: true })
    .click();
  await page.waitForURL(base + "/admin?module=products");
  assert.equal(
    (await check(db.from("products").select("id").eq("id", productId))).length,
    0,
  );
  console.log(
    "Draft product creation, automatic SKU, EGP prices, photo upload/save, Excel template and confirmed deletion passed.",
  );
  await page.goto(base + "/admin?module=cms");
  assert.equal(await page.getByLabel(/Page path/).inputValue(), "");
  assert.equal(
    await page.getByLabel("Title · en", { exact: true }).inputValue(),
    "",
  );
  await page.goto(base + "/admin?module=promotions");
  await page.getByLabel("Coupon code", { exact: true }).fill(coupon);
  await page.getByLabel("Discount type").selectOption("fixed");
  await page.getByLabel("Discount amount · EGP").fill("50");
  await page.getByRole("button", { name: "Save coupon", exact: true }).click();
  await page.waitForURL(`**id=${coupon}`);
  let saved = await check(
    db.from("coupons").select("amount").eq("code", coupon).single(),
  );
  assert.equal(saved.amount, 5000);
  assert.equal(
    await page.getByLabel("Discount amount · EGP").inputValue(),
    "50",
  );
  await check(
    db.from("part_requests").insert({
      id: inquiry,
      user_id: admin.id,
      contact: "01000000000",
      description: "Disposable admin audit inquiry",
      consent: true,
      status: "pending",
      vehicle_details: { request_type: "contact", topic: "QA" },
    }),
  );
  await page.goto(`${base}/admin?module=inquiries&id=${inquiry}`);
  await page.getByLabel("Quoted amount · EGP (whole pounds)").fill("1250");
  await page
    .getByRole("button", { name: "Update inquiry", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: /Saved/ }).waitFor();
  saved = await check(
    db.from("part_requests").select("quoted_amount").eq("id", inquiry).single(),
  );
  assert.equal(saved.quoted_amount, 125000);
  await page.reload();
  assert.equal(
    await page.getByLabel("Quoted amount · EGP (whole pounds)").inputValue(),
    "1250",
  );
  await page.goto(base + "/admin?module=campaigns");
  await page
    .getByLabel("Title · en", { exact: true })
    .fill("QA campaign " + run);
  await page
    .getByLabel("Title · ar", { exact: true })
    .fill("حملة اختبار مؤقتة");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL("**module=campaigns&id=**");
  campaignId = new URL(page.url()).searchParams.get("id");
  assert.ok(campaignId);
  const savedCampaignResponse = page.waitForResponse(
    (r) =>
      r.url() === base + "/api/admin-campaign" &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const campaignResponse = await savedCampaignResponse;
  assert.equal(campaignResponse.status(), 200, await campaignResponse.text());
  const campaigns = await check(
    db
      .from("campaigns")
      .select("id,enabled")
      .eq("title->>en", "QA campaign " + run),
  );
  assert.equal(campaigns.length, 1);
  assert.equal(campaigns[0].enabled, false);
  for (const module of [
    "products",
    "vehicles",
    "cms",
    "settings",
    "promotions",
    "inquiries",
    "orders",
  ]) {
    await page.goto(`${base}/admin?module=${module}`);
    await page.getByRole("link", { name: "View storefront" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact),
    );
    await fs.writeFile(
      `/tmp/admin-axe-${module}.json`,
      JSON.stringify(
        serious.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            summary: n.failureSummary,
          })),
        })),
        null,
        2,
      ),
    );
    console.log(
      module,
      "accessibility:",
      serious.map((v) => v.id).join(",") || "passed",
    );
    assert.deepEqual(
      serious.map((v) => v.id),
      [],
      `${module} has serious accessibility findings`,
    );
  }
  assert.deepEqual(pageErrors, []);
  const regular = await create(false),
    guest = await browser.newContext(),
    gp = await guest.newPage();
  await gp.goto(base + "/admin");
  assert.equal(
    await gp
      .getByRole("option", { name: "Create account", exact: true })
      .count(),
    0,
  );
  const forbiddenLogin = await gp.request.post(base + "/api/auth", {
    headers: { origin: base },
    data: {
      email: regular.email,
      password: regular.password,
      mode: "login",
      destination: "admin",
      locale: "en",
    },
  });
  assert.equal(forbiddenLogin.status(), 403);
  const forbiddenSignup = await gp.request.post(base + "/api/auth", {
    headers: { origin: base },
    data: {
      email: regular.email,
      password: regular.password,
      mode: "signup",
      destination: "admin",
      locale: "en",
    },
  });
  assert.equal(forbiddenSignup.status(), 403);
  await gp.request.post(base + "/api/auth", {
    headers: { origin: base },
    data: {
      email: regular.email,
      password: regular.password,
      mode: "login",
      destination: "account",
      locale: "en",
    },
  });
  const denied = await gp.request.post(base + "/api/admin-inquiry", {
    headers: { origin: base },
    data: { id: inquiry, status: "closed" },
  });
  assert.equal(denied.status(), 403);
  await guest.close();
  console.log(
    "Tabs, unsaved edits, blank CMS page, whole-EGP coupon/quote persistence, duplicate campaign prevention, mobile navigation and non-admin access checks passed.",
  );
} finally {
  if (browser) await browser.close();
  // Match only this run's unique draft in case navigation failed before productId was read.
  await check(
    db
      .from("products")
      .delete()
      .eq("name->>en", "QA audit part " + run)
      .eq("status", "draft"),
  );
  if (photoPaths.size)
    await check(db.storage.from("catalog-images").remove([...photoPaths]));
  await check(db.from("coupons").delete().eq("code", coupon));
  await check(db.from("part_requests").delete().eq("id", inquiry));
  await check(
    db
      .from("campaigns")
      .delete()
      .eq("title->>en", "QA campaign " + run),
  );
  for (const id of users) {
    await check(db.from("admin_audit_logs").delete().eq("user_id", id));
    await check(db.from("admins").delete().eq("user_id", id));
    await check(db.auth.admin.deleteUser(id));
  }
  console.log(
    "All disposable records and accounts removed; merchant records unchanged.",
  );
}
