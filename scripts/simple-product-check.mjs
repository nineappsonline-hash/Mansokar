import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import sharp from "sharp";
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
const uploadedPaths = [];
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
  await page.getByRole("button", { name: "Photos", exact: true }).click();
  await page
    .getByRole("heading", { name: "Add product photos", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Product details", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Spare part name · en").inputValue(),
    "QA oil filter " + marker,
  );
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
    .select("id,brand,slug,name")
    .eq("id", config.model_id)
    .single();
  if (modelError) throw modelError;
  const brandNames = {
    opel: "Opel",
    mg: "MG",
    chevrolet: "Chevrolet",
    peugeot: "Peugeot",
    citroen: "Citroën",
  };
  const firstName = `${brandNames[model.brand]} ${model.name.en}`;
  await page.getByRole("button", { name: "Cars & years", exact: true }).click();
  await page.getByRole("checkbox", { name: firstName, exact: true }).check();
  const firstGroup = page.getByRole("group", { name: firstName, exact: true });
  await firstGroup.getByLabel(/From year/).selectOption(String(config.year));
  await firstGroup
    .getByLabel(/Through year/)
    .selectOption(String(config.year + 1));
  await firstGroup
    .getByRole("button", { name: "Add year range", exact: true })
    .click();
  const { data: otherModels } = await db
    .from("vehicle_models")
    .select("id,brand,name")
    .neq("brand", model.brand)
    .limit(1);
  const other = otherModels[0],
    otherName = `${brandNames[other.brand]} ${other.name.en}`;
  await page.getByRole("checkbox", { name: otherName, exact: true }).check();
  await page
    .getByRole("group", { name: otherName, exact: true })
    .getByRole("checkbox", { name: "2021", exact: true })
    .check();
  await page
    .getByText("Optional: exact engine versions", { exact: true })
    .click();
  await page
    .getByRole("checkbox", {
      name: new RegExp(
        `${brandNames[model.brand]} ${model.name.en} ${config.year} ·`,
      ),
    })
    .first()
    .check();
  await page
    .getByRole("button", { name: "Product details", exact: true })
    .click();
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
  assert.equal(
    product.specs[`car_years:${model.id}`],
    `${config.year},${config.year + 1}`,
  );
  assert.equal(product.specs[`car_years:${other.id}`], "2021");
  assert.ok(product.description.en.includes(other.name.en));
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
  await page.getByRole("button", { name: "Cars & years", exact: true }).click();
  assert.equal(
    await page
      .getByRole("group", { name: firstName, exact: true })
      .getByRole("checkbox", { name: String(config.year), exact: true })
      .isChecked(),
    true,
  );
  assert.equal(
    await page
      .getByRole("group", { name: otherName, exact: true })
      .getByRole("checkbox", { name: "2021", exact: true })
      .isChecked(),
    true,
  );
  await page.screenshot({
    path: "docs/screenshots/admin-product-cars-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Product details", exact: true })
    .click();
  await page.getByRole("button", { name: "Photos", exact: true }).click();
  await page
    .getByRole("heading", { name: "Product photos", exact: true })
    .waitFor();
  assert.ok(await page.getByLabel("Upload product photo").isEnabled());
  const png = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#f5b53f" },
  })
    .png()
    .toBuffer();
  page.on("response", async (r) => {
    if (r.url().includes("/api/upload?kind=catalog") && r.ok()) {
      const data = await r.json();
      uploadedPaths.push(data.path);
    }
  });
  const transfer = await page.evaluateHandle((base64) => {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], "one.png", { type: "image/png" }));
    dt.items.add(new File([bytes], "two.png", { type: "image/png" }));
    return dt;
  }, png.toString("base64"));
  await page
    .getByTestId("product-photo-dropzone")
    .dispatchEvent("drop", { dataTransfer: transfer });
  await page.getByText(/2 photos uploaded/).waitFor();
  const altAr = page.getByLabel("Image description · ar"),
    altEn = page.getByLabel("Image description · en");
  for (let i = 0; i < 2; i++) {
    await altAr.nth(i).fill("صورة اختبار");
    await altEn.nth(i).fill("QA photo");
  }
  const imageSave = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin-images"),
  );
  await page
    .getByRole("button", {
      name: "Save image order and descriptions",
      exact: true,
    })
    .click();
  assert.equal((await imageSave).status(), 200);
  const { data: savedImages, error: imageError } = await db
    .from("product_images")
    .select("path")
    .eq("product_id", product.id);
  if (imageError) throw imageError;
  assert.equal(savedImages.length, 2);
  await page.screenshot({
    path: "docs/screenshots/admin-product-photos-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Item brands", exact: true }).click();
  await page
    .getByRole("heading", { name: "Your item brands", exact: true })
    .waitFor();
  await page.getByLabel("Search item brands").fill(maker);
  await page
    .getByRole("button", { name: "Excel import & export", exact: true })
    .click();
  await page
    .getByRole("link", {
      name: "Download Excel import template ↗",
      exact: true,
    })
    .waitFor();
  const template = await page.request.get(
    base + "/api/admin-export?format=xlsx&template=true",
  );
  assert.equal(template.status(), 200);
  for (const [old, section] of [
    ["images", "Product photos"],
    ["taxonomy", "Your item brands"],
    ["import", "Import and export products with Excel"],
  ]) {
    await page.goto(base + `/admin?module=${old}&id=${product.id}`);
    await page.getByRole("heading", { name: section, exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get("module"), "products");
  }
  await page.goto(base + `/admin?module=products&id=${product.id}`);
  await page.screenshot({
    path: "docs/screenshots/admin-products-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(
    () =>
      (document.querySelector("aside")?.getBoundingClientRect().right ?? 1) <=
      0,
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Combined product page mobile overflow",
  );
  await page.screenshot({
    path: "docs/screenshots/admin-product-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cars & years", exact: true }).click();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile car-year tab overflow",
  );
  await page.screenshot({
    path: "docs/screenshots/admin-product-cars-mobile.png",
    fullPage: true,
  });
  console.log(
    "Combined product workspace: product save, fitments, brand, photos context, Excel template, legacy redirects, unsaved tab state and mobile layout passed.",
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
  if (uploadedPaths.length)
    await db.storage.from("catalog-images").remove(uploadedPaths);
  await db.from("manufacturers").delete().eq("name", maker);
  if (user) {
    await db.from("admin_audit_logs").delete().eq("user_id", user.id);
    await db.from("admins").delete().eq("user_id", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
}
