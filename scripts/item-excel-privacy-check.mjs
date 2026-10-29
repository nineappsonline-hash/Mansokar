import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import ExcelJS from "exceljs";
import sharp from "sharp";
if (process.env.CONFIRM_LIVE_QA !== "mansokar")
  throw Error("Set CONFIRM_LIVE_QA=mansokar");
const base = process.env.BASE_URL || "http://localhost:3104",
  marker = randomUUID(),
  email = `excel-${marker}@example.invalid`,
  password = marker + "Aa1!",
  maker = "QA Excel " + marker,
  newMake = "qa-make-" + marker;
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
let user, browser, product;
const photoPath = randomUUID() + ".jpg";
let uploaded = false;
try {
  const photo = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#d5b980" },
  })
    .jpeg()
    .toBuffer();
  const uploadPhoto = await db.storage
    .from("catalog-images")
    .upload(photoPath, photo, { contentType: "image/jpeg" });
  if (uploadPhoto.error) throw uploadPhoto.error;
  uploaded = true;
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  user = created.data.user;
  const grant = await db
    .from("admins")
    .insert({ user_id: user.id, enabled: true });
  if (grant.error) throw grant.error;
  browser = await chromium.launch({ headless: true });
  const admin = await browser.newPage();
  await admin.goto(base + "/admin");
  await admin.getByLabel("Email", { exact: true }).fill(email);
  await admin.getByLabel("Password", { exact: true }).fill(password);
  await admin.getByRole("button", { name: "Sign in", exact: true }).click();
  await admin.getByRole("heading", { name: "Overview", exact: true }).waitFor();
  const template = await admin.request.get(
    base + "/api/admin-export?format=xlsx&template=true",
  );
  assert.equal(template.status(), 200);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await template.body());
  assert.equal(workbook.worksheets[0].rowCount, 1);
  assert.ok(workbook.getWorksheet("Examples — copy to Products").rowCount >= 3);
  const sheet = workbook.worksheets[0],
    headers = sheet.getRow(1).values.slice(1);
  for (const [make, model, years] of [
    ["opel", "astra", ""],
    ["chevrolet", "cruze", "2022, 2023"],
    [newMake, "QA New Model", "2018-2020"],
  ]) {
    const row = {
      item_key: "",
      name_ar: "فلتر اختبار خصوصية",
      name_en: "Privacy filter " + marker,
      item_brand: maker,
      country_of_origin: "Germany",
      cost_price: 500,
      sale_price: 750,
      part_number: "QA-" + marker,
      type: "After Market",
      warranty_months: 12,
      status: "published",
      orderable: "false",
      car_make: make,
      car_model: model,
      start_year: make === "opel" ? 2015 : "",
      end_year: make === "opel" ? 2020 : "",
      years,
      photos: JSON.stringify([
        { path: photoPath, alt: { ar: "صورة اختبار", en: "QA photo" } },
      ]),
    };
    sheet.addRow(headers.map((h) => row[h] ?? ""));
  }
  await admin.goto(base + "/admin?module=products");
  await admin.getByRole("button", { name: "Excel import & export" }).click();
  const input = admin.getByLabel("CSV / XLSX (max 1 MB)");
  const payload = (buffer) => ({
    name: "items.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer,
  });
  await input.setInputFiles(payload(await template.body()));
  await admin.getByRole("button", { name: "Check file", exact: true }).click();
  await admin.getByText(/No product rows found/).waitFor();
  assert.ok(
    await admin
      .getByRole("button", { name: "Import checked products" })
      .isDisabled(),
  );
  await input.setInputFiles(
    payload(Buffer.from(await workbook.xlsx.writeBuffer())),
  );
  await admin.getByRole("button", { name: "Check file", exact: true }).click();
  await admin.getByText(/Dry run: 1 valid items/).waitFor();
  assert.ok(
    await admin
      .getByRole("button", { name: "Import checked products" })
      .isEnabled(),
  );
  await input.setInputFiles(payload(await template.body()));
  assert.ok(
    await admin
      .getByRole("button", { name: "Import checked products" })
      .isDisabled(),
  );
  await admin.getByRole("button", { name: "Check file", exact: true }).click();
  await admin.getByText(/No product rows found/).waitFor();
  assert.ok(
    await admin
      .getByRole("button", { name: "Import checked products" })
      .isDisabled(),
  );
  const upload = await admin.request.post(base + "/api/admin-file", {
    headers: { Origin: base },
    multipart: {
      file: {
        name: "items.xlsx",
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
      },
    },
  });
  assert.equal(upload.status(), 200, await upload.text());
  const { rows } = await upload.json();
  assert.equal(rows.length, 1);
  const preview = await admin.request.post(base + "/api/admin-import-preview", {
    headers: { Origin: base },
    data: { rows },
  });
  assert.equal(preview.status(), 200, await preview.text());
  const before = await db
    .from("manufacturers")
    .select("name")
    .eq("name", maker);
  assert.equal(before.data.length, 0);
  assert.equal(
    (await db.from("vehicle_brands").select("slug").eq("slug", newMake)).data
      .length,
    0,
  );
  const commit = await admin.request.post(base + "/api/admin-import", {
    headers: { Origin: base },
    data: { rows },
  });
  assert.equal(commit.status(), 200, await commit.text());
  const stored = await db
    .from("products")
    .select("*")
    .eq("manufacturer", maker)
    .single();
  if (stored.error) throw stored.error;
  product = stored.data;
  assert.equal(
    product.specs["car_years:opel-astra"],
    "2015,2016,2017,2018,2019,2020",
  );
  const newModel = await db
    .from("vehicle_models")
    .select("id")
    .eq("brand", newMake)
    .single();
  assert.ifError(newModel.error);
  const registered = await db
    .from("vehicle_model_years")
    .select("year")
    .eq("model_id", newModel.data.id)
    .order("year");
  assert.deepEqual(
    registered.data.map((y) => y.year),
    [2018, 2019, 2020],
  );
  await admin.goto(base + "/admin?module=vehicles");
  await admin.getByRole("button", { name: newMake }).click();
  await admin.getByRole("button", { name: /QA New Model/ }).click();
  await admin
    .getByRole("heading", { name: "Registered model years" })
    .waitFor();
  assert.match(await admin.locator("main").innerText(), /2018, 2019, 2020/);
  assert.equal(product.specs["car_years:chevrolet-cruze"], "2022,2023");
  assert.equal(product.specs.warranty_months, "12");
  const imageRows = await db
    .from("product_images")
    .select("path")
    .eq("product_id", product.id);
  assert.equal(imageRows.data.length, 1);
  assert.equal(imageRows.data[0].path, photoPath);
  const publicContext = await browser.newContext(),
    page = await publicContext.newPage();
  for (const [make, model, year, label, other] of [
    ["opel", "astra", 2020, "Astra", "Cruze"],
    ["chevrolet", "cruze", 2022, "Cruze", "Astra"],
  ]) {
    await page.goto(
      `${base}/en/catalog?make=${make}&model=${model}&year=${year}`,
    );
    const card = page.locator(".product-card").filter({ hasText: marker });
    assert.equal(await card.count(), 1);
    assert.ok(
      (await card.innerText()).toLowerCase().includes(label.toLowerCase()),
    );
    assert.ok(
      !(await card.innerText()).toLowerCase().includes(other.toLowerCase()),
    );
    await card.locator(".card-navigation-link").click();
    await page.waitForURL("**/products/**");
    await page.reload();
    await page.locator("h1").waitFor();
    assert.ok(
      (await page.locator("h1").innerText())
        .toLowerCase()
        .includes(label.toLowerCase()),
    );
    const html = await page.content();
    assert.ok(
      !html.toLowerCase().includes(other.toLowerCase()),
      "Other car leaked in HTML/RSC/metadata: " +
        html.slice(
          Math.max(0, html.toLowerCase().indexOf(other.toLowerCase()) - 180),
          html.toLowerCase().indexOf(other.toLowerCase()) + 220,
        ),
    );
    assert.ok(!html.includes("car_years:"), "Application matrix leaked");
  }
  const scopedUrl = new URL(page.url());
  scopedUrl.search = new URLSearchParams({
    make: "opel",
    model: "astra",
  }).toString();
  await page.goto(scopedUrl.href);
  const description = await page
    .locator('meta[name="description"]')
    .getAttribute("content");
  const keywords = await page
    .locator('meta[name="keywords"]')
    .getAttribute("content");
  for (let year = 2015; year <= 2020; year++) {
    assert.ok(
      description.includes(`Opel ASTRA ${year}`) ||
        description.toLowerCase().includes(`opel astra ${year}`),
    );
    assert.ok(keywords.toLowerCase().includes(`opel astra ${year}`));
  }
  assert.ok(!description.toLowerCase().includes("cruze"));
  const api = await page.request.get(`${base}/api/products?ids=${product.id}`);
  const publicBody = await api.text();
  assert.ok(!publicBody.includes("car_years:"));
  assert.ok(!publicBody.includes("Astra"));
  assert.ok(!publicBody.includes("Cruze"));
  assert.ok(!publicBody.includes('"cost"'));
  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const hidden = await anon
    .from("products")
    .select("specs,description,seo")
    .eq("id", product.id);
  assert.ok(
    hidden.error,
    "Direct public database access must not expose vehicle mapping",
  );
  const exported = await admin.request.get(
    base + "/api/admin-export?format=xlsx",
  );
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(await exported.body());
  const values = [];
  book.worksheets[0].eachRow((r, n) => {
    if (n > 1 && r.getCell(2).value === product.sku) values.push(r.values);
  });
  assert.equal(values.length, 3);
  console.log(
    "Check file UI (blank, valid, stale-data rejection), Excel examples, automatic fields, multi-car grouping, preview without writes, public car-scoped cards/pages/metadata/API, direct database privacy new make/model/year creation, registered admin years and three-row export passed.",
  );
} finally {
  await browser?.close();
  if (!product) {
    const rows = await db
      .from("products")
      .select("id")
      .eq("manufacturer", maker);
    product = rows.data?.[0];
  }
  if (product) await db.from("products").delete().eq("id", product.id);
  await db.from("vehicle_models").delete().eq("brand", newMake);
  await db.from("vehicle_brands").delete().eq("slug", newMake);
  if (uploaded) await db.storage.from("catalog-images").remove([photoPath]);
  await db.from("manufacturers").delete().eq("name", maker);
  if (user) {
    await db.from("admin_audit_logs").delete().eq("user_id", user.id);
    await db.from("admins").delete().eq("user_id", user.id);
    await db.auth.admin.deleteUser(user.id);
  }
}
