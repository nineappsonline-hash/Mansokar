import { shippingInput } from "@/lib/shipping-input";
import { contactInput } from "@/lib/contact-input";
import { vehicleInput } from "@/lib/vehicle-input";
import { apiError } from "@/lib/api-errors";
import { readLimited } from "@/lib/body";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { enforceRate } from "@/lib/rate-limit";
import {
  authClient,
  configured,
  currentUser,
  requireAdmin,
  service,
  vehicleCatalog,
  allRows,
} from "@/lib/db";
import { checkoutInput, productInput } from "@/lib/validation";
import { automaticProduct } from "@/lib/product-automation";
import { applicationSpecs } from "@/lib/product-applications";
import { planImportVehicles } from "@/lib/import-vehicles";
import { prepareItemRows } from "@/lib/prepare-item-import";
import { validateImport } from "@/lib/importer";
import { assertDemoAllowed, availablePayments } from "@/lib/payments";

export const runtime = "nodejs";
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  let responseLocale: "ar" | "en" = "en";
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin)
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 2_000_000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    await enforceRate(
      request,
      action,
      ["auth", "contact"].includes(action) ? 8 : 30,
    );
    if (!configured())
      return NextResponse.json(
        {
          error:
            "Database setup required. This read-only demo does not save requests or orders. / يلزم إعداد قاعدة البيانات.",
        },
        { status: 503 },
      );
    const raw = (await readLimited(request, 2_000_000)).toString("utf8");
    if (raw.length > 2_000_000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const b = JSON.parse(raw);
    responseLocale = (b.ui_locale ?? b.locale) === "ar" ? "ar" : "en";
    const db = service();
    const { vehicles } = await vehicleCatalog();
    if (action === "analytics") {
      if (
        process.env.ANALYTICS_ENABLED !== "true" ||
        request.cookies.get("analytics-consent")?.value !== "yes"
      )
        return NextResponse.json(
          { error: "Consent required" },
          { status: 403 },
        );
      const input = z
        .object({
          event: z.enum([
            "view_item",
            "search",
            "select_item",
            "add_to_cart",
            "begin_checkout",
            "part_request",
          ]),
          product: z.string().max(150).optional(),
        })
        .strict()
        .parse(b);
      let productId = null;
      if (input.product) {
        const { data } = await db
          .from("products")
          .select("id")
          .eq("status", "published")
          .or(
            `id.eq.${input.product.replace(/[^a-zA-Z0-9_-]/g, "")},slug.eq.${input.product.replace(/[^a-zA-Z0-9_-]/g, "")}`,
          )
          .maybeSingle();
        if (!data) throw Error("Unknown product");
        productId = data.id;
      }
      const { error } = await db
        .from("analytics_events")
        .insert({ event: input.event, product_id: productId });
      if (error) throw error;
      return NextResponse.json({ message: "Recorded" });
    }
    if (action === "contact") {
      const input = contactInput.parse(b);
      const { error } = await db.from("part_requests").insert({
        contact: input.phone,
        description: input.inquiry,
        consent: true,
        status: "pending",
        vehicle_config_id: null,
        vehicle_details: {
          request_type: "contact",
          topic: input.topic,
          locale: input.ui_locale,
        },
      });
      if (error) throw error;
      return NextResponse.json({
        message:
          input.ui_locale === "ar"
            ? "تم استلام طلبك. سنتواصل معك على الرقم المسجل."
            : "Your inquiry has been received. We will contact you on the number provided.",
      });
    }
    if (action === "auth") {
      const input = z
        .object({
          email: z.email(),
          password: z.string().min(8).max(128),
          mode: z.enum(["login", "signup"]),
          locale: z.enum(["ar", "en"]),
          destination: z.enum(["account", "admin"]).default("account"),
        })
        .parse(b);
      const auth = await authClient();
      const { error } =
        input.mode === "login"
          ? await auth.auth.signInWithPassword(input)
          : await auth.auth.signUp({
              email: input.email,
              password: input.password,
              options: {
                emailRedirectTo: new URL(
                  "/auth/confirm",
                  process.env.NEXT_PUBLIC_SITE_URL ?? request.url,
                ).toString(),
              },
            });
      if (error)
        return NextResponse.json(
          {
            error:
              responseLocale === "ar"
                ? "تعذر تسجيل الدخول أو إنشاء الحساب. تحقق من البيانات وتأكيد البريد الإلكتروني."
                : "Unable to sign in or register. Check your details and email verification.",
          },
          { status: 400 },
        );
      return NextResponse.json({
        message:
          input.mode === "signup"
            ? "Check your email to verify your account. / تحقق من بريدك."
            : "Signed in / تم الدخول",
        ...(input.mode === "login"
          ? {
              redirect:
                input.destination === "admin"
                  ? "/admin"
                  : `/${input.locale}/account`,
            }
          : {}),
      });
    }
    if (action === "logout") {
      await (await authClient()).auth.signOut();
      return NextResponse.json({ redirect: "/ar/account" });
    }
    if (action === "privacy-request") {
      const user = await currentUser();
      if (!user) throw Error("Unauthorized");
      const { error } = await db.from("part_requests").insert({
        user_id: user.id,
        contact: user.email ?? user.id,
        description:
          "ACCOUNT DATA DELETION REQUEST: review according to the merchant-approved legal retention policy. No deletion has occurred automatically.",
        consent: true,
      });
      if (error) throw error;
      return NextResponse.json({
        message:
          "Deletion request saved for administrator review. / تم حفظ طلب الحذف للمراجعة.",
      });
    }
    if (
      action === "profile" ||
      action === "address" ||
      action === "address-delete"
    ) {
      const user = await currentUser();
      if (!user) throw Error("Unauthorized");
      let error;

      if (action === "profile") {
        const input = z
          .object({
            name: z.string().min(2).max(100),
            phone: z.string().regex(/^01[0125][0-9]{8}$/),
            locale: z.enum(["ar", "en"]),
          })
          .parse(b);
        ({ error } = await db
          .from("profiles")
          .upsert({ user_id: user.id, ...input }));
      } else if (action === "address") {
        const input = z
          .object({
            name: z.string().min(2).max(100),
            phone: z.string().regex(/^01[0125][0-9]{8}$/),
            area_id: z.string().max(100).optional(),
            details: z.string().min(10).max(500),
          })
          .parse(b);
        const values = {
          ...input,
          area_id: input.area_id || null,
          user_id: user.id,
        };
        if (b.id)
          ({ error } = await db
            .from("saved_addresses")
            .update(values)
            .eq("id", z.uuid().parse(b.id))
            .eq("user_id", user.id));
        else ({ error } = await db.from("saved_addresses").insert(values));
      } else {
        ({ error } = await db
          .from("saved_addresses")
          .delete()
          .eq("id", z.uuid().parse(b.id))
          .eq("user_id", user.id));
      }
      if (error) throw error;
      return NextResponse.json({ message: "Saved / تم الحفظ" });
    }
    if (action === "cart") {
      const user = await currentUser();
      if (!user) throw Error("Unauthorized");
      const items = z
        .array(
          z.object({
            id: z.string().max(100),
            qty: z.number().int().min(1).max(99),
          }),
        )
        .max(40)
        .parse(b.items);
      const { error } = await db.from("member_carts").upsert({
        user_id: user.id,
        items,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      return NextResponse.json({ message: "Saved" });
    }
    if (["garage", "garage-active", "garage-delete"].includes(action)) {
      const user = await currentUser();
      if (!user) throw Error("Unauthorized");
      const vehicle =
        action === "garage-delete"
          ? null
          : z.string().min(1).max(100).parse(b.vehicle);
      if (vehicle && !vehicles.some((v) => v.id === vehicle))
        throw Error("Invalid vehicle");
      const { data, error } = await db.rpc("garage_change", {
        p_user: user.id,
        p_action:
          action === "garage-delete"
            ? "delete"
            : action === "garage-active"
              ? "active"
              : "save",
        p_vehicle: vehicle,
        p_id: b.id ? z.uuid().parse(b.id) : null,
        p_nickname:
          b.nickname === undefined
            ? null
            : z.string().max(70).parse(b.nickname),
      });
      if (error) throw error;
      const response = NextResponse.json({
        message: "Garage updated / تم تحديث الجراج",
      });
      response.cookies.set("vehicle", data.vehicle ?? "", {
        path: "/",
        sameSite: "lax",
        maxAge: data.vehicle ? 2592000 : 0,
        secure: process.env.NODE_ENV === "production",
      });
      return response;
    }
    if (action === "request") {
      const input = z
        .object({
          contact: z.string().min(6).max(254),
          vehicle: z.string().max(100),
          description: z.string().min(10).max(3000),
          consent: z.literal("yes"),
          imageToken: z.uuid().optional(),
        })
        .parse(b);
      const custom = input.vehicle === "other";
      if (!custom && !vehicles.some((v) => v.id === input.vehicle))
        throw Error("Invalid vehicle");
      const details = custom
        ? z
            .object({
              make: z.enum(["opel", "peugeot", "citroen", "mg", "chevrolet"]),
              model: z.string().trim().min(1).max(100),
              year: z.coerce.number().int().min(1950).max(2100),
              engine: z.string().trim().min(1).max(100),
            })
            .parse(b)
        : {};
      const user = await currentUser();
      const { error } = await db.rpc("create_inquiry_v2", {
        p_contact: input.contact,
        p_description: input.description,
        p_vehicle: custom ? null : input.vehicle,
        p_details: details,
        p_user: user?.id ?? null,
        p_upload: input.imageToken ?? null,
      });
      if (error) throw error;
      return NextResponse.json({ message: "Inquiry saved. / تم حفظ الطلب." });
    }
    if (action === "checkout-quote") {
      if (!availablePayments().includes("cod"))
        throw Error("Cash on delivery has not been enabled");
      const input = z
        .object({
          items: checkoutInput.shape.items,
          phone: checkoutInput.shape.phone,
          area: checkoutInput.shape.area,
          coupon: checkoutInput.shape.coupon,
        })
        .parse(b);
      const user = await currentUser();
      const { data, error } = await db.rpc("checkout_quote", {
        p_items: input.items,
        p_customer: { phone: input.phone },
        p_area: input.area,
        p_coupon: input.coupon || null,
        p_user: user?.id ?? null,
        p_demo_allowed:
          process.env.NODE_ENV !== "production" &&
          process.env.ALLOW_DEMO_CHECKOUT === "true",
      });
      if (error) throw Error(error.message);
      return NextResponse.json(data, {
        headers: { "Cache-Control": "no-store" },
      });
    }
    if (action === "checkout") {
      const input = checkoutInput.parse(b);
      if (!availablePayments().includes("cod"))
        throw Error("Cash on delivery has not been enabled");
      const { data: policies } = await db
        .from("cms_pages")
        .select("slug")
        .in("slug", ["policies/terms", "policies/returns", "policies/privacy"])
        .eq("published", true);
      if ((policies?.length ?? 0) < 3)
        throw Error("Merchant policies must be approved before checkout");
      if (input.vehicle && !vehicles.some((v) => v.id === input.vehicle))
        throw Error("Invalid vehicle");
      const { data: products, error: productError } = await db
        .from("products")
        .select("demo")
        .in(
          "id",
          input.items.map((i) => i.id),
        );
      if (productError) throw productError;
      for (const p of products ?? []) assertDemoAllowed(p.demo);
      const user = await currentUser();
      const { data, error } = await db.rpc("place_order", {
        p_key: input.key,
        p_items: input.items,
        p_customer: {
          review_total: input.review_total,
          delivery_notes: input.notes || "",
          name: input.name,
          phone: input.phone,
          address: input.address,
          analytics_consent:
            process.env.ANALYTICS_ENABLED === "true" &&
            request.cookies.get("analytics-consent")?.value === "yes",
        },
        p_area: input.area,
        p_coupon: input.coupon || null,
        p_vehicle: input.vehicle || null,
        p_user: user?.id ?? null,
        p_demo_allowed:
          process.env.NODE_ENV !== "production" &&
          process.env.ALLOW_DEMO_CHECKOUT === "true",
      });
      if (error) {
        const allowed = [
          "Order total changed. Review your order again.",
          "Delivery area is not configured",
          "Invalid or expired coupon",
          "Product unavailable",
          "Demo checkout prohibited",
          "Idempotency key reused with different request",
        ];
        throw Error(
          allowed.find((m) => error.message.includes(m)) ||
            "Unable to place order. Please verify cart and delivery details.",
        );
      }
      return NextResponse.json({
        redirect: `/${input.locale}/order/confirmation/${data.token}`,
      });
    }
    if (action.startsWith("admin-")) {
      const admin = await requireAdmin();
      let details: unknown = {};
      const commit = (payload: unknown) =>
        db.rpc("admin_commit", {
          p_actor: admin.id,
          p_action: action,
          p_payload: payload,
        });
      if (action === "admin-hero-slides") {
        const input = z
          .object({
            slides: z
              .array(
                z.object({
                  id: z.uuid(),
                  path: z.string().regex(/^[a-f0-9-]+\.jpg$/),
                  alt: z.object({
                    ar: z.string().trim().min(1).max(500),
                    en: z.string().trim().min(1).max(500),
                  }),
                  enabled: z.boolean(),
                }),
              )
              .max(10)
              .refine(
                (rows) =>
                  new Set(rows.map((r) => r.id)).size === rows.length &&
                  new Set(rows.map((r) => r.path)).size === rows.length,
                "Choose distinct slideshow images",
              ),
            intervalSeconds: z.number().int().min(3).max(30),
            autoplay: z.boolean(),
          })
          .parse(JSON.parse(b.json));
        if (input.slides.length) {
          const { data, error } = await db.storage
            .from("catalog-images")
            .createSignedUrls(
              input.slides.map((s) => s.path),
              60,
            );
          if (error || data.some((r) => r.error || !r.signedUrl))
            throw Error(
              "One or more images are unavailable. Upload the image again or remove it.",
            );
        }
        const { error } = await db.rpc("admin_save_hero_slides", {
          p_actor: admin.id,
          p_slides: input.slides,
          p_interval: input.intervalSeconds,
          p_autoplay: input.autoplay,
        });
        if (error) throw error;
      } else if (action === "admin-site-media") {
        const input = z
          .object({
            slot: z
              .string()
              .regex(
                /^(hero|logo|brand-(opel|peugeot|citroen|mg|chevrolet)-(photo|logo)|model-[a-z0-9-]+|campaign-[a-f0-9-]+)$/,
              ),
            path: z
              .string()
              .regex(/^[a-f0-9-]+\.jpg$/)
              .nullable(),
            alt: z.object({
              ar: z.string().min(1).max(500),
              en: z.string().min(1).max(500),
            }),
          })
          .parse(typeof b.json === "string" ? JSON.parse(b.json) : b);
        if (input.path) {
          const { error } = await db.storage
            .from("catalog-images")
            .createSignedUrl(input.path, 60);
          if (error) throw Error("Upload a valid image before assigning it");
        }
        const { error } = await commit(input);
        if (error) throw error;
      } else if (action === "admin-customer-profile") {
        const input = z
          .object({
            user_id: z.uuid(),
            name: z.string().trim().min(2).max(100),
            phone: z.string().regex(/^01[0125][0-9]{8}$/),
            locale: z.enum(["ar", "en"]),
          })
          .parse(b);
        const { error } = await commit(input);
        if (error) throw error;
      } else if (action === "admin-customer-note") {
        const input = z
          .object({
            user_id: z.uuid(),
            body: z.string().trim().min(1).max(3000),
          })
          .parse(b);
        const { error } = await commit(input);
        if (error) throw error;
      } else if (action === "admin-relations") {
        const input = z
          .object({
            product: z.string().min(1).max(100),
            relations: z
              .array(
                z.object({
                  id: z.string().min(1).max(100),
                  kind: z.enum(["alternative", "together"]),
                }),
              )
              .max(100),
          })
          .refine(
            (v) =>
              v.relations.every((r) => r.id !== v.product) &&
              new Set(v.relations.map((r) => r.id)).size === v.relations.length,
            "Choose distinct related products",
          )
          .parse(typeof b.json === "string" ? JSON.parse(b.json) : b);
        const { error } = await commit(input);
        if (error) throw error;
      } else if (action === "admin-campaign") {
        const input = z
          .object({
            id: z.uuid().default(() => crypto.randomUUID()),
            title: z.object({
              ar: z.string().min(1).max(200),
              en: z.string().min(1).max(200),
            }),
            body: z.object({
              ar: z.string().max(1000),
              en: z.string().max(1000),
            }),
            href: z
              .string()
              .regex(/^\/(?:ar|en)\/[a-zA-Z0-9/?=&%_.-]*$/)
              .nullable(),
            image: z
              .string()
              .regex(/^\/images\/[a-zA-Z0-9/_.-]+$/)
              .nullable(),
            starts_at: z.iso.datetime(),
            ends_at: z.iso.datetime(),
            enabled: z.boolean(),
          })
          .refine(
            (v) => new Date(v.ends_at) > new Date(v.starts_at),
            "Campaign end must follow its start",
          )
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
      } else if (action === "admin-product") {
        const parsed = typeof b.json === "string" ? JSON.parse(b.json) : b;
        if (parsed.automatic === true) {
          const ids = z
            .array(z.string().min(1).max(100))
            .max(500)
            .parse(parsed.fitments ?? []);
          const months = z
            .number()
            .int()
            .min(1)
            .max(600)
            .nullable()
            .parse(parsed.warrantyMonths);
          const existing = parsed.id
            ? await db
                .from("products")
                .select("*")
                .eq("id", z.string().parse(parsed.id))
                .single()
            : null;
          if (existing?.error) throw existing.error;
          const { vehicles, models, brands } = await vehicleCatalog();
          const applications = z
            .array(
              z.object({
                model_id: z.string().min(1).max(100),
                years: z
                  .array(z.number().int().min(1950).max(2100))
                  .min(1)
                  .max(151),
              }),
            )
            .max(30)
            .optional()
            .parse(parsed.applications);
          if (
            applications?.some((a) => !models.some((m) => m.id === a.model_id))
          )
            throw Error("Unknown car model");
          const applicationNames = applications?.flatMap((a) => {
            const m = models.find((m) => m.id === a.model_id)!;
            const brand = brands.find((b) => b.slug === m.brand);
            return [...new Set(a.years)]
              .sort((a, b) => a - b)
              .map((year) => ({
                name: {
                  ar: `${brand?.ar || m.brand} ${m.name.ar} ${year}`,
                  en: `${brand?.name || m.brand} ${m.name.en} ${year}`,
                },
              }));
          });
          const selected = ids.map((id) => vehicles.find((v) => v.id === id));
          if (selected.some((v) => !v))
            throw Error("Unknown vehicle configuration");
          const sku =
            existing?.data?.sku ||
            `MS-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
          const manufacturer = z
            .string()
            .trim()
            .min(1)
            .max(100)
            .parse(parsed.manufacturer);
          if (parsed.addBrand === true) {
            const { error } = await db
              .from("manufacturers")
              .upsert(
                { name: manufacturer },
                { onConflict: "name", ignoreDuplicates: true },
              );
            if (error) throw error;
          }
          const auto = automaticProduct({
            name: z
              .object({
                ar: z.string().trim().min(1).max(200),
                en: z.string().trim().min(1).max(200),
              })
              .parse(parsed.name),
            manufacturer,
            partNumber: parsed.partNumber,
            vehicles: applicationNames?.length
              ? applicationNames
              : (selected as any),
            months,
            sku,
            slug: existing?.data?.slug,
          });
          const { error: categoryError } = await db.from("categories").upsert(
            {
              slug: "spare-parts",
              name: { ar: "قطع غيار", en: "Spare parts" },
            },
            { onConflict: "slug", ignoreDuplicates: true },
          );
          if (categoryError) throw categoryError;
          Object.assign(parsed, auto, {
            manufacturer,
            id: existing?.data?.id || crypto.randomUUID(),
            category: existing?.data?.category || "spare-parts",
            family: existing?.data?.family || sku,
            specs: {
              ...(applications
                ? applicationSpecs(parsed.specs || {}, applications)
                : parsed.specs),
              ...(months === null
                ? { warranty_months: "" }
                : { warranty_months: String(months) }),
            },
          });
        }
        const { fitments: ignored, ...product } = productInput.parse(parsed);
        if (!product.id) {
          const { data: existing } = await db
            .from("products")
            .select("id")
            .eq("sku", product.sku)
            .maybeSingle();
          if (existing) product.id = existing.id;
        }
        const { error } =
          parsed.automatic === true
            ? await db.rpc("admin_commit", {
                p_actor: admin.id,
                p_action: "admin-import",
                p_payload: [{ ...product, fitments: parsed.fitments ?? [] }],
              })
            : await commit(product);
        if (error) throw error;
        if (parsed.automatic === true) {
          return NextResponse.json({
            redirect: `/admin?module=products&id=${product.id}`,
          });
        }
        details = { sku: product.sku };
      } else if (action === "admin-fitments") {
        const input = z
          .object({
            product: z.string().max(100),
            vehicles: z.array(z.string().max(100)).max(500),
          })
          .parse(typeof b.json === "string" ? JSON.parse(b.json) : b);
        const { error } = await commit(input);
        if (error) throw error;
        details = input;
      } else if (
        action === "admin-import-preview" ||
        action === "admin-import"
      ) {
        let rows = typeof b.json === "string" ? JSON.parse(b.json) : b.rows;
        const modern = Array.isArray(rows) && rows.some((r) => r.spreadsheet);
        let vehicleAdditions: ReturnType<
          typeof planImportVehicles
        >["additions"] = [];
        if (modern) {
          const [{ models, brands }, existing] = await Promise.all([
            vehicleCatalog(),
            allRows<any>("products"),
          ]);
          const plan = planImportVehicles(rows, models, brands);
          vehicleAdditions = plan.additions;
          rows = prepareItemRows(plan.rows, plan.models, existing);
        }
        const result = validateImport(rows);
        if (!result.valid)
          return NextResponse.json(
            { error: JSON.stringify(result.errors), errors: result.errors },
            { status: 422 },
          );
        const [{ data: makers }, { data: categories }, { data: catalogRows }] =
          await Promise.all([
            db.from("manufacturers").select("name"),
            db.from("categories").select("slug"),
            db.from("products").select("sku,slug"),
          ]);
        const relationErrors: unknown[] = [];
        result.rows.forEach((row, index) => {
          if (!modern && !makers?.some((m) => m.name === row.manufacturer))
            relationErrors.push({
              row: index + 1,
              field: "manufacturer",
              message: "Unknown manufacturer",
            });
          if (
            !categories?.some((c) => c.slug === row.category) &&
            !(modern && row.category === "spare-parts")
          )
            relationErrors.push({
              row: index + 1,
              field: "category",
              message: "Unknown category",
            });
          if (
            catalogRows?.some((p) => p.slug === row.slug && p.sku !== row.sku)
          )
            relationErrors.push({
              row: index + 1,
              field: "slug",
              message: "Slug belongs to another SKU",
            });
          for (const v of row.fitments ?? [])
            if (!vehicles.some((config) => config.id === v))
              relationErrors.push({
                row: index + 1,
                field: "fitments",
                message: "Unknown configuration: " + v,
              });
        });
        if (relationErrors.length)
          return NextResponse.json(
            { error: JSON.stringify(relationErrors), errors: relationErrors },
            { status: 422 },
          );
        for (const row of result.rows) {
          if (row.images?.length) {
            const { data, error } = await db.storage
              .from("catalog-images")
              .createSignedUrls(
                row.images.map((i) => i.path),
                60,
              );
            if (error || data.some((i) => i.error))
              throw Error(
                "One or more photo paths are unavailable. Upload photos first.",
              );
          }
        }
        if (action === "admin-import-preview")
          return NextResponse.json({
            message: `Dry run: ${result.rows.length} valid items; ${vehicleAdditions.length} new car models will be created. No changes saved.`,
          });
        if (modern) {
          const { error } = await db.from("manufacturers").upsert(
            [...new Set(result.rows.map((r) => r.manufacturer))].map(
              (name) => ({ name }),
            ),
            { onConflict: "name", ignoreDuplicates: true },
          );
          if (error) throw error;
          const category = await db.from("categories").upsert(
            {
              slug: "spare-parts",
              name: { ar: "قطع غيار", en: "Spare parts" },
            },
            { onConflict: "slug", ignoreDuplicates: true },
          );
          if (category.error) throw category.error;
        }
        const { error } = await commit(
          result.rows.map((row, i) =>
            i === 0 ? { ...row, _vehicle_models: vehicleAdditions } : row,
          ),
        );
        if (error) throw error;
        details = { rows: result.rows.length };
      } else if (action === "admin-shipping") {
        const input = shippingInput.parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { area: input.id };
      } else if (action === "admin-cms") {
        const input = z
          .object({
            slug: z.string().min(1).max(150),
            title: z.object({ ar: z.string().min(1), en: z.string().min(1) }),
            body: z.object({
              ar: z.string().max(20000),
              en: z.string().max(20000),
            }),
            published: z.boolean(),
            seo: z
              .object({
                title: z
                  .object({
                    ar: z.string().max(200).default(""),
                    en: z.string().max(200).default(""),
                  })
                  .optional(),
                description: z
                  .object({
                    ar: z.string().max(500).default(""),
                    en: z.string().max(500).default(""),
                  })
                  .optional(),
              })
              .optional(),
          })
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { slug: input.slug };
      } else if (action === "admin-images") {
        const input = z
          .object({
            product: z.string().max(100),
            images: z
              .array(
                z.object({
                  path: z.string().regex(/^[a-f0-9-]+\.jpg$/),
                  alt: z.object({
                    ar: z.string().min(1).max(500),
                    en: z.string().min(1).max(500),
                  }),
                }),
              )
              .max(10),
          })
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { product: input.product };
      } else if (action === "admin-free-shipping") {
        const input = z
          .object({
            free_shipping_threshold: z.number().int().min(0).nullable(),
          })
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { key: "shipping" };
      } else if (action === "admin-settings") {
        const input = z
          .object({
            storeName: z
              .object({
                ar: z.string().min(1).max(100),
                en: z.string().min(1).max(100),
              })
              .optional(),
            heroTitle: z
              .object({
                ar: z.string().min(1).max(200),
                en: z.string().min(1).max(200),
              })
              .optional(),
            heroIntro: z
              .object({ ar: z.string().max(1000), en: z.string().max(1000) })
              .optional(),
            heroImage: z
              .string()
              .regex(/^\/images\/[a-zA-Z0-9/_.-]+$/)
              .optional(),
            contact: z
              .object({ ar: z.string().max(1000), en: z.string().max(1000) })
              .optional(),
          })
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { key: "storefront" };
      } else if (action === "admin-coupon") {
        const input = z
          .object({
            code: z.string().regex(/^[A-Z0-9_-]{2,40}$/),
            kind: z.enum(["fixed", "percentage"]),
            amount: z.number().int().positive(),
            starts_at: z.iso.datetime(),
            ends_at: z.iso.datetime(),
            max_redemptions: z.number().int().positive(),
            per_customer_limit: z
              .number()
              .int()
              .positive()
              .nullable()
              .optional(),
            scope_category: z.string().max(100).nullable().optional(),
          })
          .parse(JSON.parse(b.json));
        if (input.kind === "percentage" && input.amount > 100)
          throw Error("Percentage must be at most 100");
        const { error } = await commit(input);
        if (error) throw error;
        details = { code: input.code };
      } else if (action === "admin-delete-vehicle-record") {
        const input = z
          .object({
            kind: z.enum(["car", "model", "generation"]),
            id: z.string().min(1).max(100),
          })
          .parse(b);
        const table = {
          car: "vehicle_configs",
          model: "vehicle_models",
          generation: "vehicle_generations",
        }[input.kind];
        const { data: removed, error: deleteError } = await db
          .from(table)
          .delete()
          .eq("id", input.id)
          .select("id");
        if (deleteError?.code === "23503")
          return NextResponse.json(
            {
              error:
                input.kind === "model"
                  ? "This model still has saved cars or generations. Remove those first."
                  : "This record is used by products, customer cars, orders or inquiries. Remove its links first; historical order records must be retained.",
            },
            { status: 409 },
          );
        if (deleteError) throw deleteError;
        if (!removed?.length)
          return NextResponse.json(
            { error: "This record no longer exists. Refresh the page." },
            { status: 404 },
          );
        details = input;
      } else if (action === "admin-vehicle") {
        const input = vehicleInput.parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = input;
      } else if (action === "admin-generation") {
        const input = z
          .object({
            id: z.string().min(1).max(100),
            model_id: z.string().min(1).max(100),
            name: z.string().min(1).max(100),
            year_start: z.number().int().min(1950).max(2100),
            year_end: z.number().int().min(1950).max(2100).nullable(),
          })
          .refine((v) => v.year_end === null || v.year_end >= v.year_start)
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
      } else if (action === "admin-model") {
        const input = z
          .object({
            id: z.string().min(1).max(100),
            brand: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .max(150),
            slug: z.string().regex(/^[a-z0-9-]+$/),
            name: z.object({ ar: z.string().min(1), en: z.string().min(1) }),
            image: z
              .string()
              .regex(/^\/images\/[a-zA-Z0-9/_.-]+$/)
              .nullable(),
          })
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { id: input.id };
      } else if (action === "admin-taxonomy") {
        const input = z
          .object({
            kind: z.enum(["manufacturer", "category"]),
            parent_slug: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .nullable()
              .optional(),
            sort_order: z.number().int().min(0).max(100000).optional(),
            description: z
              .object({ ar: z.string().max(5000), en: z.string().max(5000) })
              .optional(),
            seo: z
              .object({
                title: z
                  .object({
                    ar: z.string().max(200).default(""),
                    en: z.string().max(200).default(""),
                  })
                  .optional(),
                description: z
                  .object({
                    ar: z.string().max(500).default(""),
                    en: z.string().max(500).default(""),
                  })
                  .optional(),
              })
              .optional(),
            name: z.string().min(1).max(100).optional(),
            slug: z
              .string()
              .regex(/^[a-z0-9-]+$/)
              .optional(),
            localized: z
              .object({ ar: z.string().min(1), en: z.string().min(1) })
              .optional(),
          })
          .parse(JSON.parse(b.json));
        const { error } = await commit(input);
        if (error) throw error;
        details = { kind: input.kind };
      } else if (action === "admin-collect-cod") {
        const id = z.uuid().parse(b.id);
        const { error } = await commit({ id });
        if (error) throw error;
        details = { order_id: id };
      } else if (action === "admin-order") {
        const input = z
          .object({
            id: z.uuid(),
            carrier: z.string().max(100).optional(),
            tracking_number: z.string().max(150).optional(),
            staff_notes: z.string().max(5000).optional(),
            status: z.enum([
              "pending_confirmation",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
              "returned",
            ]),
          })
          .parse(b);
        const { error } = await commit(input);
        if (error) throw error;
        details = input;
      } else if (action === "admin-inquiry") {
        const input = z
          .object({
            id: z.uuid(),
            status: z.enum(["pending", "quoted", "resolved", "closed"]),
            quoted_amount: z.preprocess(
              (v) => (v === "" ? undefined : v),
              z.coerce.number().int().min(0).optional(),
            ),
            staff_notes: z.string().max(5000).optional(),
          })
          .parse(b);
        const { error } = await commit(input);
        if (error) throw error;
        details = input;
      } else
        return NextResponse.json(
          { error: "Unknown operation" },
          { status: 404 },
        );
      revalidatePath("/", "layout");
      return NextResponse.json({ message: "Saved / تم الحفظ" });
    }
    return NextResponse.json({ error: "Unknown operation" }, { status: 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    const status =
      message === "Unauthorized"
        ? 401
        : message === "Forbidden"
          ? 403
          : message.includes("Too many")
            ? 429
            : error instanceof z.ZodError
              ? 422
              : 400;
    return NextResponse.json(
      {
        error: apiError(error, responseLocale, action.startsWith("admin-")),
      },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}
