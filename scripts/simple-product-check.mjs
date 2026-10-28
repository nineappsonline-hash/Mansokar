import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
if (process.env.CONFIRM_LIVE_QA !== "mansokar")
  throw Error("Set CONFIRM_LIVE_QA=mansokar");
const base = process.env.BASE_URL || "http://localhost:3104";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const marker = randomUUID();
const email = `product-qa-${marker}@example.invalid`,
  password = randomUUID() + "Aa1!";
let user, browser, product;
const maker = `QA ${marker}`;
try {
  const result = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (result.error) throw result.error;
  user = result.data.user;
  const { error } = await db
    .from("admins")
    .insert({ user_id: user.id, enabled: true });
  if (error) throw error;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(base + "/admin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "docs/screenshots/admin-overview-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile dashboard overflow",
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Products", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "New product", exact: true })
    .waitFor();
  await page.screenshot({
    path: "docs/screenshots/admin-product-mobile.png",
    fullPage: true,
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile form overflow",
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/admin?module=products");
  await page.getByLabel("Spare part name · en").fill("QA oil filter " + marker);
  await page.getByLabel("Spare part name · ar").fill("فلتر زيت للاختبار");
  await page.getByLabel("Item brand — search or select").fill(maker);
  await page
    .getByRole("button", { name: `Add “${maker}” as a new item brand` })
    .click();
  const { data: configs, error: configError } = await db
    .from("vehicle_configs")
    .select("id,model_id,year")
    .limit(1);
  if (configError) throw configError;
  assert.ok(configs.length, "At least one configured vehicle required");
  const config = configs[0];
  const { data: model, error: modelError } = await db
    .from("vehicle_models")
    .select("brand,slug")
    .eq("id", config.model_id)
    .single();
  if (modelError) throw modelError;
  await page.getByLabel(/Car make/).selectOption(model.brand);
  await page.getByLabel(/Car model/).selectOption(model.slug);
  await page.getByLabel(/Model year/).selectOption(String(config.year));
  await page.locator("fieldset input[type=checkbox]").first().check();
  await page.getByLabel("Warranty · months (blank if not supplied)").fill("12");
  await page.getByLabel("Part number", { exact: true }).fill("QA-" + marker);
  await page.getByLabel("Sale price · EGP", { exact: true }).fill("1250");
  const responsePromise = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin-product"),
  );
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  const response = await responsePromise;
  assert.equal(response.status(), 200, await response.text());
  const { data: rows, error: productError } = await db
    .from("products")
    .select("*")
    .eq("manufacturer", maker);
  if (productError) throw productError;
  assert.equal(rows.length, 1);
  product = rows[0];
  assert.match(product.sku, /^MS-[A-F0-9]{16}$/);
  assert.match(product.slug, /qa-oil-filter/);
  assert.ok(product.description.en.includes(String(config.year)));
  assert.ok(product.description.en.includes(maker));
  assert.equal(product.specs.warranty_months, "12");
  assert.match(product.warranty.en, /12-month/);
  assert.ok(product.seo.title.en.includes("Egypt"));
  const { data: fits, error: fitError } = await db
    .from("product_fitments")
    .select("*")
    .eq("product_id", product.id);
  if (fitError) throw fitError;
  assert.equal(fits.length, 1);
  await page.goto(base + `/admin?module=products&id=${product.id}`);
  assert.equal(
    await page
      .getByLabel("Warranty · months (blank if not supplied)")
      .inputValue(),
    "12",
  );
  assert.equal(
    await page.getByLabel(/Type/).locator("option[value=oem]").textContent(),
    "Original",
  );
  console.log(
    "Simplified product creation, brand creation, automatic content, warranty and fitments passed.",
  );
} finally {
  await browser?.close();
  if (!product) {
    const { data } = await db
      .from("products")
      .select("id")
      .eq("manufacturer", maker);
    product = data?.[0];
  }
  if (product) await db.from("products").delete().eq("id", product.id);
  await db.from("manufacturers").delete().eq("name", maker);
  if (user) {
    await db.from("admin_audit_logs").delete().eq("user_id", user.id);
    await db.from("admins").delete().eq("user_id", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
}
