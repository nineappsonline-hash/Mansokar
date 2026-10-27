// Run only against the dedicated Mansokar project. Creates and removes disposable QA accounts.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(
  url &&
    process.env.SUPABASE_SECRET_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "Server environment required",
);
assert.equal(
  process.env.CONFIRM_LIVE_QA,
  "mansokar",
  "Set CONFIRM_LIVE_QA=mansokar for disposable account tests",
);
const settings = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, process.env.SUPABASE_SECRET_KEY, settings);
const publicClient = () =>
  createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, settings);
const anon = publicClient();
const users = [];
const run = randomUUID();
const path = `${run}.jpg`;
const check = async (result) => {
  const r = await result;
  if (r.error) throw Error(r.error.message);
  return r.data;
};
const checks = [];
let catalogPath;
const imageProductId = "qa-image-" + run;
const reportOrderIds = [];
const reportCoupon = "QA_" + run.replaceAll("-", "").toUpperCase();
let browser;
try {
  const products = await check(
    anon.from("products").select("id,sku").eq("status", "published"),
  );
  assert.ok(products.length >= 8);
  assert.ok((await anon.from("products").select("cost")).error);
  for (const table of [
    "admins",
    "product_fitments",
    "orders",
    "notification_outbox",
    "customer_notes",
  ])
    assert.ok((await anon.from(table).select("*")).error, table);
  assert.ok((await anon.rpc("import_products", { p_rows: [] })).error);
  checks.push(
    "Public catalog works; private cost, mappings, orders, outbox and mutations are denied.",
  );
  for (let i = 0; i < 2; i++) {
    const password = randomUUID() + "aA1!";
    const email = `mansokar-qa-${i}-${run}@example.invalid`;
    const result = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (result.error) throw result.error;
    users.push({
      id: result.data.user.id,
      email,
      password,
      client: publicClient(),
    });
    const login = await users[i].client.auth.signInWithPassword({
      email,
      password,
    });
    if (login.error) throw login.error;
    assert.equal(
      (await users[i].client.auth.getUser()).data.user.id,
      users[i].id,
    );
  }
  await check(
    users[0].client.from("profiles").upsert({
      user_id: users[0].id,
      name: "Disposable QA",
      phone: "01000000000",
      locale: "en",
    }),
  );
  assert.equal(
    (
      await check(
        users[1].client.from("profiles").select("*").eq("user_id", users[0].id),
      )
    ).length,
    0,
  );
  assert.ok(
    (
      await users[1].client
        .from("profiles")
        .upsert({ user_id: users[0].id, name: "Unauthorized" })
    ).error,
  );
  checks.push(
    "Real Auth password sign-in and cross-member profile RLS verified.",
  );
  const buckets = await check(service.storage.listBuckets());
  for (const id of ["inquiry-images", "catalog-images"])
    assert.equal(buckets.find((b) => b.id === id)?.public, false);
  const jpeg = await sharp({
    create: { width: 8, height: 8, channels: 3, background: "#ffbb00" },
  })
    .jpeg()
    .toBuffer();
  await check(
    service.storage
      .from("inquiry-images")
      .upload(path, jpeg, { contentType: "image/jpeg" }),
  );
  assert.ok((await anon.storage.from("inquiry-images").download(path)).error);
  const signed = await check(
    service.storage.from("inquiry-images").createSignedUrl(path, 60),
  );
  assert.equal((await fetch(signed.signedUrl)).status, 200);
  checks.push(
    "Both buckets are private; anonymous image access denied and short signed access works.",
  );
  if (process.env.BASE_URL) {
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(30000);
    const verification = await service.auth.admin.generateLink({
      type: "signup",
      email: `mansokar-qa-verify-${run}@example.invalid`,
      password: randomUUID() + "aA1!",
    });
    if (verification.error) throw verification.error;
    users.push({ id: verification.data.user.id });
    await page.goto(
      process.env.BASE_URL +
        "/auth/confirm?token_hash=" +
        encodeURIComponent(verification.data.properties.hashed_token) +
        "&type=signup",
    );
    await page.waitForURL("**/ar/account");
    assert.ok(
      (await service.auth.admin.getUserById(verification.data.user.id)).data
        .user.email_confirmed_at,
    );
    checks.push(
      "One-time email confirmation callback verifies the email and establishes a website session (test link generated privately; no email sent).",
    );
    await page.goto(process.env.BASE_URL + "/en/account");
    const post = (action, body) =>
      page.evaluate(
        async ({ action, body }) => {
          const r = await fetch("/api/" + action, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const text = await r.text();
          let result;
          try {
            result = JSON.parse(text);
          } catch {
            throw Error(
              action +
                ": HTTP " +
                r.status +
                " returned non-JSON (" +
                text.length +
                " bytes)",
            );
          }
          return { status: r.status, body: result };
        },
        { action, body },
      );
    assert.equal(
      (
        await post("auth", {
          email: users[0].email,
          password: users[0].password,
          mode: "login",
          locale: "en",
        })
      ).status,
      200,
    );
    assert.equal((await post("admin-product", {})).status, 403);
    await users[0].client.auth.updateUser({ data: { role: "admin" } });
    assert.equal((await post("admin-product", {})).status, 403);
    assert.equal(
      (await post("garage-active", { vehicle: "opel-astra-2021-0" })).status,
      200,
    );
    assert.equal(
      (await post("cart", { items: [{ id: "demo-1", qty: 2 }] })).status,
      200,
    );
    const cart = await page.request.get(process.env.BASE_URL + "/api/cart");
    assert.deepEqual((await cart.json()).items, [{ id: "demo-1", qty: 2 }]);
    assert.equal(
      (
        await post("address", {
          name: "Disposable QA",
          phone: "01000000000",
          details: "Disposable acceptance test address",
        })
      ).status,
      200,
    );
    await check(
      service.from("admins").insert({ user_id: users[0].id, enabled: true }),
    );
    await page.goto(process.env.BASE_URL + "/admin?module=products");
    await page
      .getByRole("heading", { name: "Products", exact: true })
      .waitFor();
    const area = "qa-" + run;
    assert.equal(
      (
        await post("admin-shipping", {
          json: JSON.stringify({
            id: area,
            governorate: "QA",
            name: "Disabled QA area",
            amount: 100,
            enabled: false,
          }),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await check(
          service
            .from("admin_audit_logs")
            .select("id")
            .eq("user_id", users[0].id)
            .eq("action", "admin-shipping"),
        )
      ).length,
      1,
    );
    await check(service.from("shipping_areas").delete().eq("id", area));
    assert.equal(
      (
        await post("admin-customer-note", {
          user_id: users[0].id,
          body: "Disposable private support note",
        })
      ).status,
      200,
    );
    assert.equal(
      (await users[1].client.from("customer_notes").select("*")).data,
      null,
    );
    await page.goto(
      process.env.BASE_URL + "/admin?module=customers&id=" + users[0].id,
    );
    await page
      .getByRole("heading", { name: "Private support notes", exact: true })
      .waitFor();
    await check(
      service.from("coupons").insert({
        code: reportCoupon,
        kind: "fixed",
        amount: 10,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 3600000).toISOString(),
        max_redemptions: 1,
      }),
    );
    for (let i = 0; i < 2; i++) {
      const id = randomUUID();
      await check(
        service.from("orders").insert({
          id,
          order_number: "QA-REPORT-" + run + "-" + i,
          idempotency_key: randomUUID(),
          request_hash: "disposable-qa",
          user_id: users[0].id,
          customer: { name: "Disposable QA report fixture" },
          shipping: {},
          subtotal: 100,
          discount: i === 0 ? 10 : 0,
          shipping_amount: 0,
          total: i === 0 ? 90 : 100,
          demo: false,
          status: "confirmed",
          payment_status: i === 0 ? "paid" : "unpaid",
        }),
      );
      reportOrderIds.push(id);
      await check(
        service.from("order_items").insert({
          order_id: id,
          product_id: "demo-1",
          snapshot: {
            sku: "QA-REPORT",
            name: { en: "Disposable report fixture", ar: "اختبار" },
            manufacturer: "QA",
            category: "filters",
            price: 100,
          },
          quantity: 1,
          cost_snapshot: 50,
        }),
      );
      if (i === 0)
        await check(
          service
            .from("coupon_redemptions")
            .insert({ order_id: id, code: reportCoupon }),
        );
    }
    await page.goto(
      process.env.BASE_URL +
        "/admin?module=reports&from=2026-10-01&to=2026-10-27",
    );
    await page
      .getByRole("heading", { name: "Placed orders", exact: true })
      .waitFor();
    const report = await page.request.get(
      process.env.BASE_URL + "/api/admin-report?from=2026-10-01&to=2026-10-27",
    );
    assert.equal(report.status(), 200);
    assert.match(report.headers()["content-type"], /text\/csv/);
    assert.match(await report.text(), /QA-REPORT-/);
    const workbook = await page.request.get(
      process.env.BASE_URL + "/api/admin-export?format=xlsx",
    );
    assert.equal(workbook.status(), 200);
    assert.equal((await workbook.body()).subarray(0, 2).toString(), "PK");
    for (const module of ["cms", "settings", "campaigns", "recommendations"]) {
      await page.goto(process.env.BASE_URL + "/admin?module=" + module);
      await page.locator("main h2").first().waitFor();
    }
    const sourceProduct = await check(
      service.from("products").select("*").eq("id", "demo-1").single(),
    );
    await check(
      service.from("products").insert({
        ...sourceProduct,
        id: imageProductId,
        sku: "QA-IMAGE-" + run,
        slug: imageProductId,
        status: "draft",
        orderable: false,
      }),
    );
    const photo = await page.request.post(
      process.env.BASE_URL + "/api/upload?kind=catalog",
      {
        headers: { origin: process.env.BASE_URL },
        multipart: {
          image: { name: "qa-photo.jpg", mimeType: "image/jpeg", buffer: jpeg },
        },
      },
    );
    assert.equal(photo.status(), 200);
    const upload = await photo.json();
    catalogPath = upload.path;
    assert.ok(upload.url);
    assert.equal(
      (
        await post("admin-images", {
          json: JSON.stringify({
            product: imageProductId,
            images: [
              {
                path: catalogPath,
                alt: { ar: "صورة اختبار", en: "Disposable QA image" },
              },
            ],
          }),
        })
      ).status,
      200,
    );
    await page.goto(
      process.env.BASE_URL + "/admin?module=images&id=" + imageProductId,
    );
    await page
      .getByRole("heading", { name: "Product image manager", exact: true })
      .waitFor();
    await page
      .getByLabel("Image description · en", { exact: true })
      .fill("Edited QA image description");
    await page
      .getByRole("button", {
        name: "Save image order and descriptions",
        exact: true,
      })
      .click();
    await page.getByRole("status").filter({ hasText: "Saved" }).waitFor();
    const savedImage = await check(
      service
        .from("product_images")
        .select("alt")
        .eq("product_id", imageProductId)
        .single(),
    );
    assert.equal(savedImage.alt.en, "Edited QA image description");
    checks.push(
      "Authenticated product photo upload, private preview and bilingual image-manager form save verified on a disposable draft product.",
    );
    await page.goto(process.env.BASE_URL + "/admin?module=cms");
    await page
      .getByLabel("Page path (about, faq, guides/article, policies/returns…)")
      .fill("guides/qa-" + run);
    await page.getByLabel("Title · ar", { exact: true }).fill("دليل اختبار");
    await page
      .getByLabel("Title · en", { exact: true })
      .fill("Disposable QA guide");
    await page
      .getByLabel("Content · ar", { exact: true })
      .fill("محتوى اختبار غير منشور");
    await page
      .getByLabel("Content · en", { exact: true })
      .fill("Unpublished acceptance fixture");
    await page
      .getByLabel("SEO title · en", { exact: true })
      .fill("QA English SEO override");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "Saved" }).waitFor();
    const draft = await check(
      service
        .from("cms_pages")
        .select("published,title,seo")
        .eq("slug", "guides/qa-" + run)
        .single(),
    );
    assert.equal(draft.published, false);
    assert.equal(draft.title.en, "Disposable QA guide");
    assert.equal(draft.seo.title.en, "QA English SEO override");
    assert.equal(
      (
        await post("admin-cms", {
          json: JSON.stringify({
            slug: "guides/qa-ar-" + run,
            title: { ar: "دليل اختبار", en: "QA draft guide" },
            body: { ar: "محتوى اختبار", en: "QA draft" },
            seo: { title: { ar: "عنوان اختبار" } },
            published: false,
          }),
        })
      ).status,
      200,
    );

    assert.equal(
      (
        await post("admin-campaign", {
          json: JSON.stringify({
            id: run,
            title: { ar: "اختبار", en: "Disposable campaign" },
            body: { ar: "", en: "" },
            href: null,
            image: null,
            starts_at: new Date().toISOString(),
            ends_at: new Date(Date.now() + 86400000).toISOString(),
            enabled: false,
          }),
        })
      ).status,
      200,
    );
    const accountSearch = await check(
      service.rpc("admin_customer_accounts", {
        p_actor: users[0].id,
        p_query: users[1].email,
      }),
    );
    assert.equal(accountSearch.members.length, 1);
    assert.equal(accountSearch.members[0].name, null);
    assert.ok(
      (
        await users[1].client.rpc("admin_customer_accounts", {
          p_actor: users[0].id,
          p_query: users[1].email,
        })
      ).error,
    );
    await page.goto(
      process.env.BASE_URL +
        "/admin?module=customers&q=" +
        encodeURIComponent(users[1].email),
    );
    await page
      .locator('a[href*="module=customers&id=' + users[1].id + '"]')
      .waitFor();
    assert.equal(
      (
        await post("admin-customer-profile", {
          user_id: users[1].id,
          name: "QA profile added by support",
          phone: "01000000000",
          locale: "en",
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await check(
          service
            .from("profiles")
            .select("name")
            .eq("user_id", users[1].id)
            .single(),
        )
      ).name,
      "QA profile added by support",
    );
    const mediaSlot = "campaign-" + run;
    assert.equal(
      (
        await post("admin-site-media", {
          json: JSON.stringify({
            slot: mediaSlot,
            path: catalogPath,
            alt: { ar: "صورة اختبار", en: "QA campaign media" },
          }),
        })
      ).status,
      200,
    );
    await page.goto(process.env.BASE_URL + "/admin?module=branding");
    await page
      .getByLabel("Image location", { exact: true })
      .selectOption(mediaSlot);
    await page
      .getByLabel("Media description · en", { exact: true })
      .fill("Edited QA media description");
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin-site-media") &&
          r.request().method() === "POST",
      ),
      page
        .getByRole("button", { name: "Save media assignment", exact: true })
        .click(),
    ]);
    assert.equal(
      (
        await check(
          service
            .from("site_media")
            .select("alt")
            .eq("slot", mediaSlot)
            .single(),
        )
      ).alt.en,
      "Edited QA media description",
    );
    const optimized = await page.request.get(
      process.env.BASE_URL +
        "/_next/image?" +
        new URLSearchParams({ url: upload.url, w: "640", q: "75" }),
    );
    assert.equal(optimized.status(), 200);
    await page
      .getByRole("button", { name: "Restore default artwork", exact: true })
      .click();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/admin-site-media") &&
          r.request().method() === "POST",
      ),
      page
        .getByRole("button", { name: "Save media assignment", exact: true })
        .click(),
    ]);
    assert.equal(
      (
        await check(
          service.from("site_media").select("slot").eq("slot", mediaSlot),
        )
      ).length,
      0,
    );
    await page.goto(process.env.BASE_URL + "/admin?module=taxonomy");
    await page
      .getByRole("heading", {
        name: "Category content and hierarchy",
        exact: true,
      })
      .waitFor();
    for (const [module, title] of [
      ["shipping", "Delivery area and approved rate"],
      ["promotions", "Coupon rules and schedule"],
      ["vehicles", "Exact vehicle configuration"],
    ]) {
      await page.goto(process.env.BASE_URL + "/admin?module=" + module);
      await page.getByRole("heading", { name: title, exact: true }).waitFor();
    }
    await page.goto(process.env.BASE_URL + "/en/request-part");
    await page
      .getByLabel("Contact email or phone", { exact: true })
      .fill(users[0].email);
    await page.getByLabel("Vehicle", { exact: true }).selectOption("other");
    await page.getByLabel("Make", { exact: true }).selectOption("opel");
    await page.getByLabel("Model", { exact: true }).fill("Unlisted QA model");
    await page.getByLabel("Year", { exact: true }).fill("2023");
    await page
      .getByLabel("Engine", { exact: true })
      .fill("QA engine for manual review");
    await page
      .getByLabel("Describe the part", { exact: true })
      .fill("QA unlisted vehicle inquiry " + run);
    await page.getByRole("checkbox").check();
    await Promise.all([
      page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/request") && r.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Send inquiry", exact: true }).click(),
    ]);
    const custom = await check(
      service
        .from("part_requests")
        .select("vehicle_config_id,vehicle_details")
        .eq("user_id", users[0].id)
        .eq("description", "QA unlisted vehicle inquiry " + run)
        .single(),
    );
    assert.equal(custom.vehicle_config_id, null);
    assert.equal(custom.vehicle_details.model, "Unlisted QA model");
    const exported = await page.request.get(
      process.env.BASE_URL + "/api/account-export",
    );
    assert.equal(exported.status(), 200);
    const personal = await exported.json();
    assert.equal(personal.account.email, users[0].email);
    assert.ok(personal.profiles.every((p) => p.user_id === users[0].id));
    assert.equal(personal.order_items.length, reportOrderIds.length);
    assert.ok(
      personal.order_items.every(
        (i) => !("cost_snapshot" in i) && !("orders" in i),
      ),
    );
    assert.ok(
      personal.orders.every(
        (o) => !("staff_notes" in o) && !("public_token" in o),
      ),
    );
    assert.ok(Array.isArray(personal.member_carts));
    assert.equal(
      (await fetch(process.env.BASE_URL + "/api/account-export")).status,
      401,
    );
    checks.push(
      "Personal data export includes own cart/order lines, excludes costs/private notes/tokens and denies anonymous download.",
    );
    checks.push(
      "Routine shipping/coupon/vehicle forms and an actual custom-vehicle inquiry form save verified; no exact fitment is asserted for the described vehicle.",
    );
    checks.push(
      "Profile-less account email lookup, member RPC denial, support profile editing, uploaded editorial-media assignment/restoration, image optimization and category form verified.",
    );
    checks.push(
      "Customer notes, report/date controls, report CSV, product XLSX and merchant CMS/settings/campaign/recommendation screens verified with real admin authentication.",
    );

    assert.equal((await post("logout", {})).status, 200);
    assert.equal(
      (
        await post("auth", {
          email: users[1].email,
          password: users[1].password,
          mode: "login",
          locale: "en",
        })
      ).status,
      200,
    );
    assert.deepEqual(
      (
        await (
          await page.request.get(process.env.BASE_URL + "/api/cart")
        ).json()
      ).items,
      [],
    );
    checks.push(
      "Live HTTP login/logout, member admin denial (including metadata spoof), Garage, cart/address persistence, cross-member cart isolation and audited admin mutation verified.",
    );
  }
  console.log(JSON.stringify({ passed: true, checks }, null, 2));
} finally {
  await browser?.close();
  await service.storage.from("inquiry-images").remove([path]);
  await service
    .from("product_images")
    .delete()
    .eq("product_id", imageProductId);
  await service.from("products").delete().eq("id", imageProductId);
  if (catalogPath)
    await service.storage.from("catalog-images").remove([catalogPath]);
  if (reportOrderIds.length) {
    for (const table of ["coupon_redemptions", "order_items"])
      await service.from(table).delete().in("order_id", reportOrderIds);
    await service.from("orders").delete().in("id", reportOrderIds);
  }
  await service.from("coupons").delete().eq("code", reportCoupon);
  await service
    .from("cms_pages")
    .delete()
    .eq("slug", "guides/qa-" + run);
  await service
    .from("cms_pages")
    .delete()
    .eq("slug", "guides/qa-ar-" + run);

  await service
    .from("site_media")
    .delete()
    .eq("slot", "campaign-" + run);
  await service.from("campaigns").delete().eq("id", run);
  await service
    .from("shipping_areas")
    .delete()
    .eq("id", "qa-" + run);
  if (users.length)
    await service
      .from("customer_notes")
      .delete()
      .in(
        "user_id",
        users.map((u) => u.id),
      );
  for (const user of users) {
    for (const table of [
      "admin_audit_logs",
      "part_requests",
      "admins",
      "member_carts",
      "garage_vehicles",
      "saved_addresses",
      "profiles",
    ]) {
      const r = await service.from(table).delete().eq("user_id", user.id);
      if (r.error) console.error("Cleanup failed for " + table);
    }
    const r = await service.auth.admin.deleteUser(user.id);
    if (r.error) console.error("QA user cleanup failed");
  }
}
