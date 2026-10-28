// Future-dated disposable rates are never offered to shoppers.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
const base = process.env.BASE_URL || "http://localhost:3104";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = async (query) => {
  const r = await query;
  if (r.error) throw Error(r.error.message);
  return r.data;
};
const run = randomUUID();
const ids = [`qa-standard-${run}`, `qa-express-${run}`];
let browser, userId;
try {
  const rows = await check(
    db
      .from("shipping_areas")
      .select("id,governorate,amount,enabled")
      .like("id", "eg-%"),
  );
  assert.equal(rows.length, 54);
  assert.equal(new Set(rows.map((a) => a.governorate)).size, 27);
  const password = randomUUID() + "aA1!",
    email = `mansokar-shipping-qa-${run}@example.invalid`;
  userId = (
    await check(
      db.auth.admin.createUser({ email, password, email_confirm: true }),
    )
  ).user.id;
  await check(db.from("admins").insert({ user_id: userId, enabled: true }));
  await check(
    db.from("shipping_areas").insert(
      ids.map((id, i) => ({
        id,
        governorate: "QA",
        name: `QA ${i ? "express" : "normal"}`,
        service_type: i ? "express" : "standard",
        amount: null,
        enabled: false,
        starts_at: "2099-01-01T00:00:00Z",
        delivery_min_hours: i ? null : 48,
        delivery_max_hours: i ? 48 : 120,
        business_days: !i,
      })),
    ),
  );
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  const login = await page.request.post(`${base}/api/auth`, {
    headers: { origin: base },
    data: { email, password, mode: "login", locale: "en" },
  });
  assert.equal(login.status(), 200);
  await page.goto(`${base}/admin?module=shipping`);
  await page
    .getByRole("heading", {
      name: "Egyptian governorates · shipping rates",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator('a[href^="/admin?module=shipping&id=eg-"]').count(),
    27,
  );
  for (let i = 0; i < ids.length; i++) {
    await page.goto(`${base}/admin?module=shipping&id=${ids[i]}`);
    const form = page.locator("section").filter({
      has: page.getByRole("heading", {
        name: i ? "Express shipping · QA" : "Normal shipping · QA",
        exact: true,
      }),
    });
    await form
      .getByLabel("Shipping rate · EGP", { exact: false })
      .fill(i ? "250.75" : "125.50");
    await form
      .getByLabel("Enable this shipping option", { exact: true })
      .check();
    await form
      .getByRole("button", { name: "Save shipping rate", exact: true })
      .click();
    await form.getByRole("status").filter({ hasText: /.+/ }).waitFor();
    assert.match(await form.getByRole("status").innerText(), /Saved|تم الحفظ/);
    const rate = await check(
      db
        .from("shipping_areas")
        .select("amount,enabled,starts_at")
        .eq("id", ids[i])
        .single(),
    );
    assert.equal(rate.amount, i ? 25075 : 12550);
    assert.equal(rate.enabled, true);
    assert.ok(new Date(rate.starts_at) > new Date());
    await page.reload();
    assert.equal(
      await form
        .getByLabel("Shipping rate · EGP", { exact: false })
        .inputValue(),
      i ? "250.75" : "125.5",
    );
  }
  console.log(
    "PASS: 27 governorates, 54 options and independent EGP rates save/reload correctly",
  );
} finally {
  await browser?.close();
  await check(db.from("shipping_areas").delete().in("id", ids));
  if (userId) {
    await check(db.from("admin_audit_logs").delete().eq("user_id", userId));
    await check(db.from("admins").delete().eq("user_id", userId));
    await check(db.from("profiles").delete().eq("user_id", userId));
    await check(db.auth.admin.deleteUser(userId));
  }
  console.log("Disposable QA rates and account removed");
}
