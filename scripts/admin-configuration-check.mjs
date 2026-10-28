// Disposable QA records only; never edit merchant records.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
const base = process.env.BASE_URL || "http://localhost:3104";
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = async (query) => {
  const result = await query;
  if (result.error) throw Error(result.error.message);
  return result.data;
};
const run = randomUUID();
const configId = `qa-config-${run}`;
const productId = `qa-product-${run}`;
let userId;
let browser;
try {
  await check(
    service
      .from("vehicle_configs")
      .select("fuel_type,forced_induction,transmission")
      .limit(1),
  );
  const password = randomUUID() + "aA1!";
  const email = `mansokar-admin-qa-${run}@example.invalid`;
  const created = await check(
    service.auth.admin.createUser({ email, password, email_confirm: true }),
  );
  userId = created.user.id;
  await check(
    service.from("admins").insert({ user_id: userId, enabled: true }),
  );
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(30000);
  const login = await page.request.post(`${base}/api/auth`, {
    headers: { origin: base },
    data: { email, password, mode: "login", locale: "en" },
  });
  assert.equal(login.status(), 200, await login.text());
  await page.goto(`${base}/admin?module=vehicles`);
  console.log(
    "Vehicle admin headings:",
    (await page.locator("h2").allTextContents()).join(" / "),
  );
  const form = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Exact vehicle configuration",
      exact: true,
    }),
  });
  await form
    .getByLabel("Vehicle brand", { exact: false })
    .selectOption("chevrolet");
  await form
    .getByLabel("Vehicle model", { exact: false })
    .selectOption("chevrolet-captiva");
  await form
    .getByLabel("Configuration identifier", { exact: false })
    .fill(configId);
  await form.getByLabel("Exact model year", { exact: false }).fill("2021");
  await form
    .getByLabel("Engine description", { exact: false })
    .fill(`QA engine ${run}`);
  await form.getByLabel("Engine capacity", { exact: false }).fill("1500");
  await form
    .getByLabel("Fuel / powertrain", { exact: false })
    .selectOption("petrol");
  await form
    .getByLabel("Turbo / forced induction", { exact: false })
    .selectOption("turbo");
  await form
    .getByLabel("Transmission", { exact: false })
    .selectOption("automatic");
  await form
    .getByLabel("Engine code (optional)", { exact: false })
    .fill("QA-CODE");
  await form.getByLabel("Body style", { exact: false }).fill("SUV");
  await form
    .getByLabel("Trim / equipment version", { exact: false })
    .fill("QA trim");
  await form
    .getByRole("button", { name: "Save vehicle configuration", exact: true })
    .click();
  await form
    .getByRole("status")
    .filter({ hasText: /Saved|تم الحفظ/ })
    .waitFor();
  const saved = await check(
    service.from("vehicle_configs").select("*").eq("id", configId).single(),
  );
  assert.equal(saved.transmission, "automatic");
  assert.equal(saved.fuel_type, "petrol");
  assert.equal(saved.forced_induction, "turbo");
  assert.equal(saved.engine_capacity, 1500);
  await page.goto(`${base}/admin?module=vehicles&id=${configId}`);
  assert.equal(
    await page.getByLabel("Transmission", { exact: false }).inputValue(),
    "automatic",
  );
  console.log(
    "PASS: admin saves and reloads vehicle powertrain and body details",
  );
  const source = (
    await check(service.from("products").select("*").limit(1))
  )[0];
  assert.ok(
    source,
    "An existing product is needed for the disposable draft fixture",
  );
  await check(
    service.from("products").insert({
      ...source,
      id: productId,
      sku: productId,
      slug: productId,
      status: "draft",
      orderable: false,
      demo: true,
    }),
  );
  await page.goto(`${base}/admin?module=products&id=${productId}`);
  await page
    .getByLabel("Fitting position", { exact: false })
    .selectOption("front");
  await page
    .getByLabel("Compatibility restrictions / exclusions · en", {
      exact: false,
    })
    .fill("QA front only; excludes version X");
  await page
    .getByLabel("Search title · en", { exact: false })
    .fill("QA product search title");
  await page.getByRole("button", { name: "Save product", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: /Saved|تم الحفظ/ })
    .first()
    .waitFor();
  const product = await check(
    service.from("products").select("specs,seo").eq("id", productId).single(),
  );
  assert.equal(product.specs.fitting_position, "front");
  assert.equal(
    product.specs.fitment_notes_en,
    "QA front only; excludes version X",
  );
  assert.equal(product.seo.title.en, "QA product search title");
  await page.getByLabel("Find vehicle", { exact: false }).fill(run);
  await page
    .getByRole("checkbox", { name: new RegExp(`QA engine ${run}`) })
    .check();
  await page
    .getByRole("button", { name: "Save exact fitments", exact: true })
    .click();
  const fitmentSection = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Compatible vehicles · exact configurations",
      exact: true,
    }),
  });
  await fitmentSection
    .getByRole("status")
    .filter({ hasText: /Saved|تم الحفظ/ })
    .waitFor();
  const mappings = await check(
    service
      .from("product_fitments")
      .select("vehicle_config_id")
      .eq("product_id", productId),
  );
  assert.ok(mappings.some((m) => m.vehicle_config_id === configId));
  await page.goto(`${base}/admin?module=products&id=${productId}`);
  assert.equal(
    await page.getByLabel("Fitting position", { exact: false }).inputValue(),
    "front",
  );
  await page.getByLabel("Find vehicle", { exact: false }).fill(run);
  assert.equal(
    await page
      .getByRole("checkbox", { name: new RegExp(`QA engine ${run}`) })
      .isChecked(),
    true,
  );
  console.log(
    "PASS: product restrictions, SEO fields and exact compatibility save and reload",
  );
  for (const locale of ["ar", "en"]) {
    const response = await page.goto(
      `${base}/${locale}/guides/identify-vehicle-configuration`,
    );
    assert.equal(response.status(), 200);
    assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
  }
  console.log(
    "PASS: new vehicle-identification guide is available in both languages",
  );
} finally {
  await browser?.close();
  await check(
    service.from("product_fitments").delete().eq("product_id", productId),
  );
  await check(service.from("products").delete().eq("id", productId));
  await check(service.from("vehicle_configs").delete().eq("id", configId));
  if (userId) {
    await check(
      service.from("admin_audit_logs").delete().eq("user_id", userId),
    );
    await check(service.from("admins").delete().eq("user_id", userId));
    await check(service.from("profiles").delete().eq("user_id", userId));
    await check(service.auth.admin.deleteUser(userId));
  }
  console.log("Disposable QA records removed");
}
