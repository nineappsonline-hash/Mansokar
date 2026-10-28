import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
if (process.env.CONFIRM_LIVE_QA !== "mansokar")
  throw Error("Set CONFIRM_LIVE_QA=mansokar");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const base = process.env.BASE_URL || "http://localhost:3104",
  marker = randomUUID(),
  email = `vehicles-${marker}@example.invalid`,
  password = marker + "Aa1!";
let user, browser, modelId;
try {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  user = data.user;
  const grant = await db
    .from("admins")
    .insert({ user_id: user.id, enabled: true });
  if (grant.error) throw grant.error;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(base + "/admin");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  await page.goto(base + "/admin?module=vehicles");
  await page.getByRole("button", { name: /Chevrolet/ }).click();
  await page.screenshot({
    path: "docs/screenshots/admin-vehicles-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add a model", exact: true }).click();
  await page.getByLabel("Model name · English").fill("QA " + marker);
  await page.getByLabel("Model name · Arabic").fill("موديل اختبار");
  const modelSave = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin-model"),
  );
  await page.getByRole("button", { name: "Save model", exact: true }).click();
  const response = await modelSave;
  assert.equal(response.status(), 200, await response.text());
  modelId = "chevrolet-qa-" + marker;
  await page.getByRole("button", { name: new RegExp("QA " + marker) }).click();
  await page
    .getByRole("button", { name: "Add year & engine", exact: true })
    .click();
  await page.getByLabel("Year", { exact: true }).fill("2021");
  await page
    .getByLabel("Engine (for example: 1.4 petrol turbo)", { exact: true })
    .fill("1.5 petrol");
  const carSave = page.waitForResponse((r) =>
    r.url().endsWith("/api/admin-vehicle"),
  );
  await page.getByRole("button", { name: "Save car", exact: true }).click();
  const carResponse = await carSave;
  assert.equal(carResponse.status(), 200, await carResponse.text());
  await page
    .getByRole("button", { name: "Edit 2021 1.5 petrol", exact: true })
    .waitFor();
  const { data: cars, error: carError } = await db
    .from("vehicle_configs")
    .select("*")
    .eq("model_id", modelId);
  if (carError) throw carError;
  assert.equal(cars.length, 1);
  assert.equal(cars[0].year, 2021);
  await page.reload();
  await page.getByRole("button", { name: /Chevrolet/ }).click();
  await page.getByRole("button", { name: new RegExp("QA " + marker) }).click();
  await page
    .getByRole("button", { name: "Edit 2021 1.5 petrol", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("Year", { exact: true }).inputValue(),
    "2021",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => (document.querySelector('aside')?.getBoundingClientRect().right ?? 1) <= 0);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile overflow",
  );
  await page.screenshot({
    path: "docs/screenshots/admin-vehicles-mobile.png",
    fullPage: true,
  });
  console.log(
    "Vehicle make/model navigation, new model, year/engine save, edit/reload and mobile layout passed.",
  );
} finally {
  await browser?.close();
  if (modelId) {
    await db.from("vehicle_configs").delete().eq("model_id", modelId);
    await db.from("vehicle_models").delete().eq("id", modelId);
  }
  if (user) {
    await db.from("admin_audit_logs").delete().eq("user_id", user.id);
    await db.from("admins").delete().eq("user_id", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
}
