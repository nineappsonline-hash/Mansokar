// Reversible SEO acceptance checks; temporary product is never orderable.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
assert.equal(process.env.CONFIRM_LIVE_QA, "mansokar");
const base = process.env.BASE_URL || "http://localhost:3104";
const canonical = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const check = async (q) => {
  const r = await q;
  if (r.error) throw Error(r.error.message);
  return r.data;
};
const run = randomUUID(),
  productId = `qa-seo-${run}`;
let browser, userId;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const sitemap = async () => {
    const r = await page.request.get(`${base}/sitemap.xml`);
    assert.equal(r.status(), 200);
    assert.match(r.headers()["content-type"], /xml/);
    return r.text();
  };
  const before = await sitemap();
  assert.ok(before.includes(`${canonical}/ar/site-map`));
  assert.ok(before.includes(`${canonical}/en/brands/chevrolet/captiva`));
  assert.ok(
    before.includes(`${canonical}/ar/guides/identify-vehicle-configuration`),
  );
  assert.ok(!before.includes("/products/precision-oil-filter"));
  assert.ok(!before.includes("/policies/warranty"));
  const source = (await check(db.from("products").select("*").limit(1)))[0];
  await check(
    db
      .from("products")
      .insert({
        ...source,
        id: productId,
        sku: productId,
        slug: productId,
        status: "draft",
        demo: false,
        orderable: false,
        name: {
          ar: "منتج اختبار مؤقت غير مخصص للبيع",
          en: "Temporary QA SEO fixture — not for sale",
        },
      }),
  );
  assert.ok(!(await sitemap()).includes(`/products/${productId}`));
  await check(
    db.from("products").update({ status: "published" }).eq("id", productId),
  );
  assert.ok(
    (await sitemap()).includes(`${canonical}/ar/products/${productId}`),
  );
  await check(
    db.from("products").update({ status: "draft" }).eq("id", productId),
  );
  assert.ok(!(await sitemap()).includes(`/products/${productId}`));
  console.log(
    "PASS: XML sitemap is nonempty, localized and updates immediately after publish/unpublish",
  );
  for (const locale of ["ar", "en"]) {
    await page.goto(`${base}/${locale}/site-map`);
    await page.getByRole("heading", { level: 1 }).waitFor();
    assert.ok(
      await page.locator(`footer a[href="/${locale}/site-map"]`).count(),
    );
    assert.ok(
      await page
        .locator(`a[href="/${locale}/brands/chevrolet/captiva"]`)
        .count(),
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.goto(`${base}/${locale}/faq`);
    assert.ok((await page.locator("main h2").count()) >= 6);
    const graph = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    assert.ok(graph.some((s) => s.includes('"WebSite"')));
  }
  await page.goto(`${base}/en/guides/check-part-compatibility`);
  assert.ok(
    (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).some((s) => s.includes('"Article"')),
  );
  console.log(
    "PASS: mobile HTML site maps, FAQ answers, site identity and guide Article markup",
  );
  const email = `mansokar-seo-qa-${run}@example.invalid`,
    password = randomUUID() + "aA1!";
  userId = (
    await check(
      db.auth.admin.createUser({ email, password, email_confirm: true }),
    )
  ).user.id;
  await check(db.from("admins").insert({ user_id: userId, enabled: true }));
  assert.equal(
    (
      await page.request.post(`${base}/api/auth`, {
        headers: { origin: base },
        data: { email, password, locale: "en", mode: "login" },
      })
    ).status(),
    200,
  );
  await page.goto(`${base}/admin?module=seo`);
  await page
    .getByRole("heading", {
      name: "SEO and answer-content status",
      exact: true,
    })
    .waitFor();
  assert.ok(
    (await page.locator('main[lang="en"]').innerText()).includes(
      "demo products excluded",
    ),
  );
  console.log("PASS: authenticated SEO status and content-readiness dashboard");
} finally {
  await browser?.close();
  await check(db.from("products").delete().eq("id", productId));
  if (userId) {
    await check(db.from("admin_audit_logs").delete().eq("user_id", userId));
    await check(db.from("admins").delete().eq("user_id", userId));
    await check(db.from("profiles").delete().eq("user_id", userId));
    await check(db.auth.admin.deleteUser(userId));
  }
  console.log("Disposable QA product and account removed");
}
