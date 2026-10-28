// Read-only policy checks with a disposable QA administrator; no emails are sent.
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
const check = async (q) => {
  const r = await q;
  if (r.error) throw Error(r.error.message);
  return r.data;
};
let browser, userId, inquiryId;
try {
  const policies = await check(
    db
      .from("cms_pages")
      .select("slug,body,published")
      .in("slug", [
        "policies/shipping",
        "policies/returns",
        "policies/warranty",
      ]),
  );
  assert.equal(policies.length, 3);
  assert.ok(policies.every((p) => p.published === false));
  browser = await chromium.launch({ headless: true });
  const publicPage = await browser.newPage();
  for (const locale of ["ar", "en"]) {
    await publicPage.goto(`${base}/${locale}/policies/warranty`);
    assert.ok(
      await publicPage
        .locator('meta[name="robots"][content*="noindex"]')
        .count(),
    );
    assert.ok(
      !(await publicPage
        .locator("main")
        .innerText()
        .then((t) =>
          t.includes(
            policies.find((p) => p.slug === "policies/warranty").body[locale],
          ),
        )),
    );
    assert.ok(
      await publicPage
        .locator(`footer a[href="/${locale}/policies/warranty"]`)
        .count(),
    );
  }
  console.log(
    "PASS: warranty links exist and unpublished policy text is not exposed publicly",
  );
  const email = `mansokar-policy-qa-${randomUUID()}@example.invalid`;
  const password = randomUUID() + "aA1!";
  userId = (
    await check(
      db.auth.admin.createUser({ email, password, email_confirm: true }),
    )
  ).user.id;
  await check(db.from("admins").insert({ user_id: userId, enabled: true }));
  const admin = await browser.newPage();
  const login = await admin.request.post(`${base}/api/auth`, {
    headers: { origin: base },
    data: { email, password, mode: "login", locale: "en" },
  });
  assert.equal(login.status(), 200);
  for (const policy of policies) {
    await admin.goto(`${base}/admin?module=cms&id=${policy.slug}`);
    assert.equal(
      await admin.getByLabel("Content · ar", { exact: false }).inputValue(),
      policy.body.ar,
    );
    assert.equal(
      await admin.getByLabel("Content · en", { exact: false }).inputValue(),
      policy.body.en,
    );
    assert.equal(
      await admin
        .getByLabel("Published (merchant approved)", { exact: true })
        .isChecked(),
      false,
    );
  }
  console.log(
    "PASS: all three bilingual policy drafts load in the CMS and remain unpublished",
  );
  const marker = `QA callback test; do not call ${randomUUID()}`;
  await publicPage.goto(`${base}/en/contact`);
  const form = publicPage.locator("#callback");
  await form.getByLabel("Mobile number", { exact: true }).fill("01000000000");
  await form
    .getByLabel("Inquiry topic", { exact: false })
    .selectOption("warranty");
  await form.getByLabel("Your inquiry", { exact: true }).fill(marker);
  await form.getByRole("checkbox").check();
  await form
    .getByRole("button", { name: "Request a callback", exact: true })
    .click();
  await form
    .getByRole("status")
    .filter({ hasText: "Your inquiry has been received" })
    .waitFor();
  const submitted = await check(
    db
      .from("part_requests")
      .select("id,contact,description,vehicle_details,status")
      .eq("description", marker)
      .single(),
  );
  inquiryId = submitted.id;
  assert.equal(submitted.contact, "01000000000");
  assert.equal(submitted.vehicle_details.request_type, "contact");
  assert.equal(submitted.vehicle_details.topic, "warranty");
  assert.equal(submitted.status, "pending");
  await admin.goto(`${base}/admin?module=inquiries&id=${inquiryId}`);
  await admin
    .getByText("Callback request · warranty", { exact: true })
    .waitFor();
  assert.ok(
    (await admin.locator('main[lang="en"]').innerText()).includes(
      "Callback request · warranty",
    ),
  );
  assert.ok(
    !(await admin.locator('main[lang="en"]').innerText()).includes(
      "Customer-described vehicle",
    ),
  );
  for (const locale of ["ar", "en"]) {
    await publicPage.setViewportSize({ width: 390, height: 844 });
    await publicPage.goto(`${base}/${locale}/contact`);
    assert.equal(
      await publicPage.locator('#callback input[name="phone"]').count(),
      1,
    );
    assert.equal(
      await publicPage.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
  }
  console.log(
    "PASS: callback form saves a warranty inquiry, appears in Admin → Inquiries and fits mobile Arabic/English layouts",
  );
} finally {
  await browser?.close();
  if (inquiryId)
    await check(db.from("part_requests").delete().eq("id", inquiryId));
  if (userId) {
    await check(db.from("admin_audit_logs").delete().eq("user_id", userId));
    await check(db.from("admins").delete().eq("user_id", userId));
    await check(db.from("profiles").delete().eq("user_id", userId));
    await check(db.auth.admin.deleteUser(userId));
  }
}
