import { test } from "node:test";
import assert from "node:assert/strict";
import { demoProducts } from "../src/lib/catalog";
import {
  productAnswers,
  productSearchCopy,
  productStructuredData,
} from "../src/lib/product-seo";

const p = {
  ...demoProducts[0],
  demo: false,
  price: 20000,
  sale: 12500,
  cost: 9000,
  specs: { country_of_origin: "Germany" },
};

test("public product projection exposes one car context and no other-car metadata or private fields", async () => {
  const { publicProduct } = await import("../src/lib/public-product");
  const raw = {
    ...p,
    description: { ar: "أسترا وكروز", en: "Astra and Cruze" },
    seo: { title: { ar: "أسترا وكروز", en: "Astra and Cruze" } },
    specs: {
      "car_years:opel-astra": "2020",
      "car_years:chevrolet-cruze": "2021",
      country_of_origin: "Germany",
    },
  };
  const scoped = publicProduct(raw, {
    modelId: "opel-astra",
    make: "opel",
    model: "astra",
    year: 2020,
    name: { ar: "أوبل أسترا 2020", en: "Opel Astra 2020" },
  });
  assert.match(scoped.name.en, /Opel Astra 2020/);
  assert.ok(!JSON.stringify(scoped).includes("Cruze"));
  assert.ok(!JSON.stringify(scoped).includes("car_years"));
  assert.ok(!JSON.stringify(scoped).includes('"cost"'));
  assert.ok(!JSON.stringify(publicProduct(raw)).includes("Astra and Cruze"));
});

test("multiple model-year selections preserve independent years and unrelated product specifications", async () => {
  const { readApplications, applicationSpecs } =
    await import("../src/lib/product-applications");
  const specs = applicationSpecs(
    { country_of_origin: "Germany", "car_years:old-model": "2020" },
    [
      { model_id: "opel-astra", years: [2022, 2020, 2020] },
      { model_id: "mg-5", years: [2021] },
    ],
  );
  assert.deepEqual(readApplications(specs), [
    { model_id: "opel-astra", years: [2020, 2022] },
    { model_id: "mg-5", years: [2021] },
  ]);
  assert.equal(specs.country_of_origin, "Germany");
  assert.equal(specs["car_years:old-model"], undefined);
  assert.deepEqual(applicationSpecs(specs, []), {
    country_of_origin: "Germany",
  });
});

test("automatic product content uses selected vehicle facts and preserves existing URLs", async () => {
  const { automaticProduct } = await import("../src/lib/product-automation");
  const input = {
    name: { ar: "فلتر زيت", en: "Oil filter" },
    manufacturer: "Bosch",
    partNumber: "ABC-123",
    vehicles: [{ name: { ar: "أوبل أسترا 2021", en: "Opel Astra 2021" } }],
    months: 12,
    sku: "MS-1234567890ABCDEF",
  };
  const result = automaticProduct(input);
  assert.match(result.slug, /oil-filter-bosch/);
  assert.match(result.description.ar, /أوبل أسترا 2021/);
  assert.match(result.description.en, /Bosch.*Opel Astra 2021/);
  assert.match(result.warranty!.en, /12-month/);
  assert.equal(automaticProduct({ ...input, months: null }).warranty, null);
  assert.equal(
    automaticProduct({ ...input, slug: "existing-url" }).slug,
    "existing-url",
  );
  assert.ok(result.slug.length <= 150);
  assert.ok(result.seo.title.en.includes("Egypt"));
  assert.ok(!JSON.stringify(result).includes("InStock"));
});

test("each SKU has localized metadata and merchant overrides", () => {
  for (const locale of ["ar", "en"] as const) {
    const copy = productSearchCopy(p, locale);
    assert.ok(copy.title.includes(p.partNumber));
    assert.ok(copy.title.includes(p.name[locale]));
    assert.ok(copy.description.includes(p.manufacturer));
  }
  assert.equal(
    productSearchCopy(
      { ...p, seo: { title: { ar: "عنوان مخصص", en: "Custom title" } } },
      "en",
    ).title,
    "Custom title",
  );
});

test("product markup uses public identifiers, real images and EGP without claiming stock or finance", () => {
  const data = productStructuredData(p, "ar", "https://example.com", [
    "/part.jpg",
  ])!;
  assert.equal(data.offers!.price, "125.00");
  assert.equal(data.offers!.priceCurrency, "EGP");
  assert.equal(data.mpn, p.partNumber);
  assert.deepEqual(data.image, ["https://example.com/part.jpg"]);
  assert.equal(data.url, `https://example.com/ar/products/${p.slug}`);
  const json = JSON.stringify(data);
  assert.ok(!json.includes('"cost"'));
  assert.ok(!json.includes("availability"));
  assert.ok(!json.includes("acceptedPaymentMethod"));
  assert.equal(
    productStructuredData(demoProducts[0], "en", "https://example.com", []),
    null,
  );
  assert.equal(
    productStructuredData(
      { ...p, status: "draft" },
      "en",
      "https://example.com",
      [],
    ),
    null,
  );
});

test("stable product media URLs are included in product schema and sitemap entries", async () => {
  const { collectSearchPages, sitemapEntries } =
    await import("../src/lib/seo-inventory");
  const pages = collectSearchPages({
    brands: [],
    modelNames: [],
    categories: [],
    cms: [],
    guides: [],
    products: [p],
    productImages: [
      {
        id: "11111111-1111-4111-8111-111111111111",
        product_id: p.id,
        path: "11111111-1111-4111-8111-111111111111.jpg",
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        product_id: p.id,
        path: "https://images.example.com/part.webp",
      },
    ],
  });
  const productPage = pages.find((page) => page.kind === "product")!;
  assert.deepEqual(productPage.images, [
    "/product-media/11111111-1111-4111-8111-111111111111",
    "https://images.example.com/part.webp",
  ]);
  const entries = sitemapEntries([productPage], "https://example.com/path");
  assert.deepEqual(entries[0].images, [
    "https://example.com/product-media/11111111-1111-4111-8111-111111111111",
    "https://images.example.com/part.webp",
  ]);
  const data = productStructuredData(
    p,
    "en",
    "https://example.com",
    productPage.images!,
  )!;
  assert.deepEqual(data.image, entries[0].images);
});

test("visible answers reflect the SKU and current payment methods in both languages", () => {
  for (const locale of ["ar", "en"] as const) {
    const answers = productAnswers(p, locale);
    assert.equal(answers.length, 5);
    assert.ok(answers.some((a) => a.answer.includes(p.partNumber)));
    assert.ok(answers.some((a) => a.answer.includes("Germany")));
    assert.ok(answers.some((a) => /Valu/.test(a.answer)));
    assert.ok(
      answers.some((a) =>
        locale === "ar"
          ? a.answer.includes("ضمان الوكيل أو المورد")
          : a.answer.includes("agent or supplier warranty"),
      ),
    );
    assert.ok(!JSON.stringify(answers).includes("9000"));
  }
});

test("product answers explain genuine brand fallback and use only recorded warranty periods", () => {
  const generic = {
    ...p,
    manufacturer: "أصلي",
    specs: { ...p.specs, warranty_months: "6" },
  };
  const ar = productAnswers(generic, "ar");
  const en = productAnswers(generic, "en");
  assert.ok(ar.some((item) => item.answer.includes("6 شهور")));
  assert.ok(en.some((item) => item.answer.includes("6 months")));
  assert.ok(
    ar.some((item) => item.answer.includes("اسم الشركة المصنعة مش متسجل")),
  );
  assert.ok(
    en.some((item) => item.answer.includes("maker’s name is not recorded")),
  );
  const unknown = productAnswers({ ...generic, specs: {} }, "en");
  assert.ok(!unknown.some((item) => item.answer.includes("6 months")));
});

test("deleted makes and models stay absent from navigation and SEO inventory for every make", async () => {
  const { coveredBrands, targetBrands } =
    await import("../src/lib/vehicle-coverage");
  const { collectSearchPages } = await import("../src/lib/seo-inventory");
  const existing = targetBrands.map((b) => ({
    slug: b.slug,
    name: b.name,
    ar: b.ar,
    models: [`saved-${b.slug}`],
  }));
  const before = JSON.stringify(existing);
  const covered = coveredBrands(existing);
  assert.deepEqual(covered, existing);
  assert.equal(JSON.stringify(existing), before);
  assert.deepEqual(coveredBrands([]), []);
  const pages = collectSearchPages({
    brands: covered,
    modelNames: [],
    categories: [],
    cms: [],
    guides: [],
    products: [],
  });
  for (const brand of targetBrands) {
    assert.ok(
      pages.some((p) => p.path === `/brands/${brand.slug}/saved-${brand.slug}`),
    );
    for (const removed of brand.models) {
      assert.ok(
        !covered
          .find((b) => b.slug === brand.slug)!
          .models.includes(removed.slug),
      );
      assert.ok(
        !pages.some((p) => p.path === `/brands/${brand.slug}/${removed.slug}`),
      );
    }
  }
  assert.deepEqual(coveredBrands(covered), covered);
});

test("buying guides have complete Arabic and English answers and unique routes", async () => {
  const { buyingGuides } = await import("../src/lib/buying-guides");
  assert.equal(
    new Set(buyingGuides.map((g) => g.slug)).size,
    buyingGuides.length,
  );
  for (const guide of buyingGuides) {
    assert.ok(/^[a-z0-9-]+$/.test(guide.slug));
    for (const locale of ["ar", "en"] as const) {
      assert.ok(guide.title[locale]);
      assert.ok(guide.description[locale]);
      assert.ok(guide.sections.length >= 3);
      assert.ok(
        guide.sections.every((s) => s.heading[locale] && s.body[locale]),
      );
    }
  }
});

test("vehicle fields allow unknown details and validate optional powertrain values", async () => {
  const { vehicleInput } = await import("../src/lib/vehicle-input");
  const base = {
    id: "config-1",
    model_id: "opel-astra",
    year: 2021,
    engine: "1.4 petrol",
  };
  assert.equal(vehicleInput.safeParse(base).success, true);
  assert.equal(
    vehicleInput.safeParse({
      ...base,
      fuel_type: "petrol",
      forced_induction: "turbo",
      transmission: "automatic",
      engine_capacity: 1400,
    }).success,
    true,
  );
  assert.equal(
    vehicleInput.safeParse({ ...base, transmission: "unknown-option" }).success,
    false,
  );
  assert.equal(
    vehicleInput.safeParse({ ...base, engine_capacity: -1 }).success,
    false,
  );
  assert.equal(vehicleInput.safeParse({ ...base, year: 1940 }).success, false);
});

test("blank localized SEO fields retain automatic metadata and restrictions appear in answers", async () => {
  const { productInput } = await import("../src/lib/validation");
  const partial = {
    ...p,
    seo: {
      title: { ar: "عنوان عربي", en: "" },
      description: { ar: "", en: "" },
    },
    specs: { ...p.specs, fitment_notes_en: "Front only; excludes version X" },
  };
  assert.equal(productInput.safeParse(partial).success, true);
  assert.equal(productSearchCopy(partial, "ar").title, "عنوان عربي");
  assert.ok(productSearchCopy(partial, "en").title.includes(p.partNumber));
  assert.ok(
    productAnswers(partial, "en").some((a) =>
      a.answer.includes("excludes version X"),
    ),
  );
});

test("callback inquiries require a valid mobile number, consent and a meaningful message", async () => {
  const { contactInput } = await import("../src/lib/contact-input");
  const input = {
    phone: "01012345678",
    topic: "warranty",
    inquiry: "Please contact me about the warranty for my order.",
    consent: "yes",
    ui_locale: "en",
  };
  assert.equal(contactInput.safeParse(input).success, true);
  assert.equal(
    contactInput.safeParse({ ...input, phone: "invalid" }).success,
    false,
  );
  assert.equal(
    contactInput.safeParse({ ...input, consent: undefined }).success,
    false,
  );
  assert.equal(
    contactInput.safeParse({ ...input, topic: "invalid" }).success,
    false,
  );
  assert.equal(
    contactInput.safeParse({ ...input, inquiry: " " }).success,
    false,
  );
});

test("Egypt shipping coverage has 27 governorates and validates configured rates", async () => {
  const { governorates, shippingLabel } = await import("../src/lib/shipping");
  const { shippingInput } = await import("../src/lib/shipping-input");
  assert.equal(governorates.length, 27);
  assert.equal(new Set(governorates.map((g) => g.code)).size, 27);
  const option = {
    id: "eg-cairo-standard",
    name: "Cairo - standard",
    governorate: "Cairo",
    service_type: "standard" as const,
    amount: 12550,
    delivery_min_hours: 48,
    delivery_max_hours: 120,
    business_days: true,
  };
  assert.ok(shippingLabel(option, "ar").includes("القاهرة"));
  assert.ok(shippingLabel(option, "en").includes("2–5 business days"));
  assert.ok(
    shippingLabel(
      {
        ...option,
        service_type: "express",
        delivery_min_hours: null,
        delivery_max_hours: 48,
        business_days: false,
      },
      "en",
    ).includes("Within 48 hours"),
  );
  assert.equal(
    shippingInput.safeParse({ ...option, enabled: true }).success,
    true,
  );
  assert.equal(
    shippingInput.safeParse({
      ...option,
      enabled: true,
      starts_at: "2099-01-01T00:00:00+00:00",
      ends_at: null,
    }).success,
    true,
  );
  assert.equal(
    shippingInput.safeParse({ ...option, amount: null, enabled: false })
      .success,
    true,
  );
  assert.equal(
    shippingInput.safeParse({ ...option, amount: null, enabled: true }).success,
    false,
  );
  assert.equal(
    shippingInput.safeParse({ ...option, amount: -1, enabled: true }).success,
    false,
  );
  assert.equal(
    shippingInput.safeParse({ ...option, amount: 0, enabled: true }).success,
    true,
  );
});

test("sitemap inventory excludes demos, drafts and invalid/private CMS routes", async () => {
  const { collectSearchPages, sitemapEntries } =
    await import("../src/lib/seo-inventory");
  const common = {
    brands: [{ slug: "opel", name: "Opel", ar: "أوبل", models: ["astra"] }],
    modelNames: [
      { brand: "opel", slug: "astra", name: { ar: "استرا", en: "Astra" } },
    ],
    categories: [],
    guides: [],
    products: [
      demoProducts[0],
      { ...p, slug: "real-part" },
      { ...p, slug: "draft-part", status: "draft" },
    ],
    cms: [
      {
        slug: "policies/returns",
        title: { ar: "الإرجاع", en: "Returns" },
        published: true,
      },
      {
        slug: "policies/privacy",
        title: { ar: "الضمان", en: "Warranty" },
        published: false,
      },
      { slug: "account", title: { ar: "خاص", en: "Private" }, published: true },
      {
        slug: "nonexistent-route",
        title: { ar: "غير موجود", en: "Missing" },
        published: true,
      },
    ],
  };
  const pages = collectSearchPages(common);
  assert.ok(pages.some((page) => page.path === "/products/real-part"));
  assert.ok(pages.some((page) => page.path === "/policies/returns"));
  for (const excluded of [
    "/products/" + demoProducts[0].slug,
    "/products/draft-part",
    "/policies/privacy",
    "/account",
    "/nonexistent-route",
  ])
    assert.ok(!pages.some((page) => page.path === excluded));
  const entries = sitemapEntries(pages, "https://example.com/ignored-path/");
  assert.equal(entries.length, pages.length * 2);
  assert.ok(
    entries.every(
      (e) =>
        e.url.startsWith("https://example.com/") &&
        !e.url.includes("ignored-path"),
    ),
  );
  assert.ok(
    entries.every(
      (e) =>
        e.alternates.languages["ar-EG"].startsWith("https://example.com/ar") &&
        e.alternates.languages["en-EG"].startsWith("https://example.com/en"),
    ),
  );
  assert.equal(new Set(entries.map((e) => e.url)).size, entries.length);
});

test("site identity provides stable entity IDs without unsupported merchant claims", async () => {
  const { siteIdentity } = await import("../src/lib/site-identity");
  const data = siteIdentity("https://example.com/en", "Mansokar");
  assert.equal(data["@graph"][0]["@id"], "https://example.com/#organization");
  assert.ok(!JSON.stringify(data).includes("address"));
  assert.ok(!JSON.stringify(data).includes("aggregateRating"));
  const { siteCopy } = await import("../src/lib/site-copy");
  for (const locale of ["ar", "en"] as const) {
    const copy = siteCopy[locale];
    const localized = siteIdentity("https://example.com", copy.name, locale);
    for (const entity of localized["@graph"]) {
      assert.equal(entity.name, copy.name);
      assert.equal(entity.description, copy.description);
      assert.equal(
        entity.alternateName,
        siteCopy[locale === "ar" ? "en" : "ar"].name,
      );
    }
  }
});

test("model-scoped public copy expands every range year without exposing other models", async () => {
  const { publicProduct } = await import("../src/lib/public-product");
  const item = publicProduct(
    {
      ...p,
      specs: {
        "car_years:opel-astra": "2015,2016,2017,2018,2019,2020",
        "car_years:other": "2021",
      },
    },
    {
      modelId: "opel-astra",
      make: "opel",
      model: "astra",
      name: { ar: "أوبل أسترا", en: "Opel Astra" },
    },
  );
  for (let year = 2015; year <= 2020; year++)
    assert.ok(item.description.en.includes(`Opel Astra ${year}`));
  assert.ok(!JSON.stringify(item).includes("2021"));
});

test("customer specs label warranty months and never present a part type as a country", async () => {
  const { countryOfOrigin, productSpecifications } =
    await import("../src/lib/product-specifications");
  const { publicProduct } = await import("../src/lib/public-product");
  for (const value of [
    "أصلي",
    "Original",
    "OEM",
    "After Market",
    "Genuine Parts",
    "غير محدد",
  ])
    assert.equal(countryOfOrigin(value), "");
  assert.equal(countryOfOrigin("Germany"), "Germany");
  const item = {
    ...p,
    specs: {
      country_of_origin: "أصلي",
      warranty_months: "6",
      "car_years:hidden": "2020",
    },
  };
  const ar = productSpecifications(item, "ar"),
    en = productSpecifications(item, "en");
  assert.deepEqual(
    ar.find((r) => r.key === "warranty_months"),
    { key: "warranty_months", label: "مدة الضمان", value: "٦ شهور" },
  );
  assert.equal(en.find((r) => r.key === "warranty_months")!.value, "6 months");
  assert.equal(
    productSpecifications(
      {
        ...item,
        specs: { ...item.specs, stock_status: "in_stock", stock_quantity: "0" },
      },
      "en",
    ).find((r) => r.key === "stock_status")!.value,
    "Out of stock",
  );
  assert.equal(
    ar.find((r) => r.key === "country_of_origin")!.value,
    "غير محدد",
  );
  assert.ok(!JSON.stringify(ar).includes("car_years"));
  assert.equal(publicProduct(item).specs.country_of_origin, "");
  assert.ok(
    !JSON.stringify(
      productStructuredData(item, "ar", "https://example.test", []),
    ).includes('"additionalProperty"'),
  );
  assert.ok(
    !productAnswers(item, "ar").some((a) =>
      a.answer.includes("بلد المنشأ: أصلي"),
    ),
  );
});

test("checkout groups translated governorates once and retains distinct delivery rates", async () => {
  const { shippingGovernorates } = await import("../src/lib/shipping");
  const areas = [
    {
      id: "normal",
      name: "Cairo normal",
      governorate: "Cairo",
      amount: 75,
      service_type: "standard" as const,
    },
    {
      id: "express",
      name: "Cairo express",
      governorate: "القاهرة",
      amount: 125,
      service_type: "express" as const,
    },
    { id: "giza", name: "Giza normal", governorate: "giza", amount: 0 },
  ];
  for (const locale of ["ar", "en"] as const) {
    const groups = shippingGovernorates(areas, locale);
    assert.equal(groups.length, 2);
    assert.equal(groups[0].label, locale === "ar" ? "القاهرة" : "Cairo");
    assert.deepEqual(
      groups[0].areas.map((a) => [a.id, a.amount]),
      [
        ["normal", 75],
        ["express", 125],
      ],
    );
    assert.equal(groups[1].areas[0].amount, 0);
  }
  assert.deepEqual(shippingGovernorates([], "en"), []);
});

test("product card vehicles show localized makes, models and exact year ranges", async () => {
  const { productCardVehicles } =
    await import("../src/lib/product-card-vehicles");
  const catalog = {
    brands: [{ slug: "opel", name: "Opel", ar: "أوبل" }],
    models: [
      {
        id: "astra",
        brand: "opel",
        slug: "astra",
        name: { en: "Astra", ar: "أسترا" },
      },
    ],
  };
  const product = {
    specs: {
      "car_years:astra": "2015,2016,2018,2019,2019",
      "car_years:deleted": "2020",
    },
  };
  assert.deepEqual(productCardVehicles(product, catalog, "en"), [
    { id: "astra", name: "Opel Astra", years: "2015–2016, 2018–2019" },
  ]);
  assert.equal(
    productCardVehicles(product, catalog, "ar")[0].name,
    "أوبل أسترا",
  );
  const context = {
    modelId: "astra",
    make: "opel",
    model: "astra",
    year: 2018,
    name: { en: "Opel Astra 2018", ar: "أوبل أسترا 2018" },
  };
  assert.equal(
    productCardVehicles(product, catalog, "en", context)[0].years,
    "2018",
  );
  assert.deepEqual(
    productCardVehicles(product, catalog, "en", { ...context, year: 2017 }),
    [],
  );
  assert.deepEqual(productCardVehicles({ specs: {} }, catalog, "en"), []);
  assert.equal(
    productCardVehicles({ specs: {} }, catalog, "en", context, true)[0].years,
    "2018",
  );
});

test("canonical product metadata and descriptions include every recorded make, model and year range", async () => {
  const { publicProduct } = await import("../src/lib/public-product");
  const catalog = {
    brands: [{ slug: "opel", name: "Opel", ar: "أوبل" }],
    models: [
      {
        id: "astra",
        brand: "opel",
        slug: "astra",
        name: { ar: "أسترا", en: "Astra" },
      },
      {
        id: "corsa",
        brand: "opel",
        slug: "corsa",
        name: { ar: "كورسا", en: "Corsa" },
      },
    ],
  };
  const raw = {
    ...p,
    specs: {
      "car_years:astra": "2015,2016,2018",
      "car_years:corsa": "2021,2022",
    },
  };
  const before = JSON.stringify(raw);
  const projected = publicProduct(raw, undefined, false, catalog);
  for (const locale of ["ar", "en"] as const) {
    const copy = productSearchCopy(projected, locale);
    for (const label of [
      locale === "ar" ? "أوبل أسترا" : "Opel Astra",
      locale === "ar" ? "أوبل كورسا" : "Opel Corsa",
      "2015–2016, 2018",
      "2021–2022",
      p.partNumber,
    ]) {
      assert.ok(copy.title.includes(label), `${locale} title missing ${label}`);
      assert.ok(
        copy.description.includes(label),
        `${locale} description missing ${label}`,
      );
      assert.ok(projected.description[locale].includes(label));
    }
  }
  assert.equal(JSON.stringify(raw), before);
  assert.ok(!JSON.stringify(projected).includes("car_years:"));
  const scoped = publicProduct(
    raw,
    {
      modelId: "astra",
      make: "opel",
      model: "astra",
      year: 2018,
      name: { ar: "أوبل أسترا 2018", en: "Opel Astra 2018" },
    },
    false,
    catalog,
  );
  assert.ok(scoped.description.en.includes("Opel Astra 2018"));
  assert.ok(!scoped.description.en.includes("Corsa"));
  const manual = publicProduct(
    {
      ...raw,
      seo: {
        manual: true,
        title: { ar: "عنوان مخصص", en: "Custom title" },
        description: { ar: "وصف مخصص", en: "Custom description" },
      },
    },
    undefined,
    false,
    catalog,
  );
  assert.ok(manual.seo!.title!.en.startsWith("Custom title"));
  assert.ok(manual.seo!.title!.en.includes("Opel Corsa 2021–2022"));
  assert.ok(manual.seo!.description!.ar.includes("أوبل أسترا 2015–2016, 2018"));
});


test("Product JSON-LD publishes only checksum-valid GTIN identifiers", () => {
  const withGtin = {
    ...p,
    specs: { ...p.specs, gtin: "4006381333931" },
  };
  const valid = productStructuredData(withGtin, "ar", "https://mopc.store", [])!;
  assert.equal((valid as Record<string, unknown>).gtin13, "4006381333931");

  const bad = productStructuredData({
    ...withGtin,
    specs: { ...withGtin.specs, gtin: "4006381333932" },
  }, "ar", "https://mopc.store", [])!;
  assert.ok(!("gtin13" in bad));
  assert.ok(!("gtin" in bad));
});
