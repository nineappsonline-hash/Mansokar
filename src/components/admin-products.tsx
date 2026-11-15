"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Search,
  Plus,
  Image,
  CarFront,
  Tags,
  FileSpreadsheet,
} from "lucide-react";
import type { Vehicle } from "@/lib/catalog";
import { readApplications } from "@/lib/product-applications";
import { ApiForm } from "./forms";
import { ProductEditorTab } from "./product-editor-context";
import styles from "./admin-products.module.css";
export function AdminProducts({
  products,
  images,
  fitments,
  vehicles,
  carBrands,
  carModels,
  selectedId,
  manufacturers,
  initialView = "products",
  initialTab = "details",
  editor,
  photos,
  excel,
}: {
  products: {
    id: string;
    sku: string;
    name: { ar: string; en: string };
    manufacturer: string;
    status: string;
    specs?: Record<string, string>;
  }[];
  images: Record<string, { url: string; count: number }>;
  fitments: { product_id: string; vehicle_config_id: string }[];
  vehicles: Vehicle[];
  carBrands: { slug: string; name: string; ar?: string }[];
  carModels: {
    id: string;
    brand: string;
    slug: string;
    name: { ar: string; en: string };
  }[];
  selectedId?: string;
  manufacturers: string[];
  initialView?: string;
  initialTab?: string;
  editor: React.ReactNode;
  photos: React.ReactNode;
  excel: React.ReactNode;
}) {
  const [view, setView] = useState(initialView),
    [tab, setTab] = useState(initialTab),
    [query, setQuery] = useState(""),
    [brandQuery, setBrandQuery] = useState(""),
    [newBrand, setNewBrand] = useState(""),
    [carMake, setCarMake] = useState(""),
    [carModel, setCarModel] = useState(""),
    [carYear, setCarYear] = useState(""),
    [itemBrand, setItemBrand] = useState(""),
    [photoFilter, setPhotoFilter] = useState("all"),
    [statusFilter, setStatusFilter] = useState("all");
  useEffect(() => setView(initialView), [initialView]);
  useEffect(() => setTab(initialTab), [initialTab]);
  const selected = products.find((p) => p.id === selectedId);
  const router = useRouter();
  function navigate(nextView: string, nextTab = tab) {
    setView(nextView);
    setTab(nextTab);
    const params = new URLSearchParams({ module: "products" });
    if (selectedId) params.set("id", selectedId);
    if (nextView !== "products") params.set("view", nextView);
    if (nextTab !== "details") params.set("tab", nextTab);
    router.replace("/admin?" + params.toString(), { scroll: false });
  }

  const vehicleById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles],
  );
  const fitmentsByProduct = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const fitment of fitments) {
      const current = map.get(fitment.product_id) ?? [];
      current.push(fitment.vehicle_config_id);
      map.set(fitment.product_id, current);
    }
    return map;
  }, [fitments]);
  const modelById = useMemo(
    () => new Map(carModels.map((model) => [model.id, model])),
    [carModels],
  );
  const applicationsByProduct = useMemo(() => {
    const map = new Map<string, ReturnType<typeof readApplications>>();
    for (const product of products)
      map.set(product.id, readApplications(product.specs ?? {}));
    return map;
  }, [products]);
  const applicationCarsByProduct = useMemo(() => {
    const map = new Map<
      string,
      { brand: string; model: string; year: number }[]
    >();
    for (const [productId, applications] of applicationsByProduct) {
      const cars: { brand: string; model: string; year: number }[] = [];
      for (const application of applications) {
        const model = modelById.get(application.model_id);
        if (!model) continue;
        for (const year of application.years)
          cars.push({ brand: model.brand, model: model.slug, year });
      }
      map.set(productId, cars);
    }
    return map;
  }, [applicationsByProduct, modelById]);
  const applicationCars = useMemo(
    () => [...applicationCarsByProduct.values()].flat(),
    [applicationCarsByProduct],
  );
  const fittedVehicles = useMemo(() => {
    const fitted = new Set(
      fitments.map((fitment) => fitment.vehicle_config_id),
    );
    return vehicles.filter((vehicle) => fitted.has(vehicle.id));
  }, [fitments, vehicles]);
  const filterVehicles = useMemo(
    () => [
      ...fittedVehicles.map(({ brand, model, year }) => ({
        brand,
        model,
        year,
      })),
      ...applicationCars,
    ],
    [applicationCars, fittedVehicles],
  );
  const makes = useMemo(
    () =>
      [...new Set(filterVehicles.map((vehicle) => vehicle.brand))].sort(
        (a, b) => makeName(a).localeCompare(makeName(b)),
      ),
    [carBrands, filterVehicles],
  );
  const models = useMemo(
    () =>
      carMake
        ? [
            ...new Set(
              filterVehicles
                .filter((vehicle) => vehicle.brand === carMake)
                .map((vehicle) => vehicle.model),
            ),
          ].sort((a, b) =>
            modelName(carMake, a).localeCompare(modelName(carMake, b)),
          )
        : [],
    [carMake, carModels, filterVehicles],
  );
  const years = useMemo(
    () =>
      carModel
        ? [
            ...new Set(
              filterVehicles
                .filter(
                  (vehicle) =>
                    vehicle.brand === carMake && vehicle.model === carModel,
                )
                .map((vehicle) => vehicle.year),
            ),
          ].sort((a, b) => b - a)
        : [],
    [carMake, carModel, filterVehicles],
  );
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((p) => {
      if (
        needle &&
        !`${p.sku} ${p.name.en} ${p.name.ar}`.toLowerCase().includes(needle)
      )
        return false;
      if (itemBrand && p.manufacturer !== itemBrand) return false;
      const pictureCount = images[p.id]?.count ?? 0;
      if (photoFilter === "with" && !pictureCount) return false;
      if (photoFilter === "without" && pictureCount) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (carMake || carModel || carYear) {
        const matchesVehicle = (vehicle: {
          brand: string;
          model: string;
          year: number;
        }) =>
          Boolean(
            (!carMake || vehicle.brand === carMake) &&
            (!carModel || vehicle.model === carModel) &&
            (!carYear || String(vehicle.year) === carYear),
          );
        const exactFit = (fitmentsByProduct.get(p.id) ?? []).some((id) => {
          const vehicle = vehicleById.get(id);
          return Boolean(vehicle && matchesVehicle(vehicle));
        });
        const modelYearFit = (applicationCarsByProduct.get(p.id) ?? []).some(
          matchesVehicle,
        );
        if (!exactFit && !modelYearFit) return false;
      }
      return true;
    });
  }, [
    applicationCarsByProduct,
    carMake,
    carModel,
    carYear,
    fitmentsByProduct,
    images,
    itemBrand,
    photoFilter,
    products,
    query,
    statusFilter,
    vehicleById,
  ]);
  const hasFilters = Boolean(
    carMake ||
    carModel ||
    carYear ||
    itemBrand ||
    photoFilter !== "all" ||
    statusFilter !== "all",
  );
  function makeName(slug: string) {
    return carBrands.find((brand) => brand.slug === slug)?.name || slug;
  }
  function modelName(make: string, slug: string) {
    return (
      carModels.find((model) => model.brand === make && model.slug === slug)
        ?.name.en || slug
    );
  }
  function makeLabel(slug: string) {
    const brand = carBrands.find((brand) => brand.slug === slug);
    if (!brand) return slug;
    return brand.ar && brand.ar !== brand.name
      ? `${brand.name} — ${brand.ar}`
      : brand.name;
  }
  function modelLabel(make: string, slug: string) {
    const model = carModels.find(
      (model) => model.brand === make && model.slug === slug,
    );
    if (!model) return slug;
    return model.name.ar && model.name.ar !== model.name.en
      ? `${model.name.en} — ${model.name.ar}`
      : model.name.en;
  }
  function changeMake(value: string) {
    setCarMake(value);
    setCarModel("");
    setCarYear("");
  }
  function changeModel(value: string) {
    setCarModel(value);
    setCarYear("");
  }
  return (
    <div className="stack admin-products-redesign" lang="ar" dir="rtl">
      <nav className={styles.tabs} aria-label="Product workspace">
        <button
          type="button"
          aria-current={view === "products" ? "page" : undefined}
          onClick={() => navigate("products")}
        >
          <Package size={17} />
          المنتجات <span>{products.length}</span>
        </button>
        <button
          type="button"
          aria-current={view === "brands" ? "page" : undefined}
          onClick={() => navigate("brands")}
        >
          <Tags size={17} />
          ماركات قطع الغيار
        </button>
        <button
          type="button"
          aria-current={view === "excel" ? "page" : undefined}
          onClick={() => navigate("excel")}
        >
          <FileSpreadsheet size={17} />
          استيراد وتصدير Excel
        </button>
      </nav>
      <div hidden={view !== "products"}>
        <div className={styles.layout}>
          <section className="panel stack">
            <div className={styles.listHeading}>
              <h2>
                قائمة المنتجات
                <span className={styles.count}>
                  {filtered.length}/{products.length}
                </span>
              </h2>
              <Link
                href="/admin?module=products#product-editor"
                aria-label="إضافة منتج جديد"
              >
                <Plus size={19} />
              </Link>
            </div>
            <label className={styles.search}>
              <Search size={16} />
              <input
                aria-label="البحث عن المنتجات"
                placeholder="ابحث باسم القطعة أو رقم SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className={styles.filters}>
              <select
                aria-label="تصفية حسب ماركة العربية"
                value={carMake}
                onChange={(e) => changeMake(e.target.value)}
              >
                <option value="">كل ماركات العربيات</option>
                {makes.map((make) => (
                  <option key={make} value={make}>
                    {makeLabel(make)}
                  </option>
                ))}
              </select>
              <select
                aria-label="تصفية حسب موديل العربية"
                value={carModel}
                disabled={!carMake}
                onChange={(e) => changeModel(e.target.value)}
              >
                <option value="">كل الموديلات</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {modelLabel(carMake, model)}
                  </option>
                ))}
              </select>
              <select
                aria-label="تصفية حسب سنة العربية"
                value={carYear}
                disabled={!carModel}
                onChange={(e) => setCarYear(e.target.value)}
              >
                <option value="">كل السنين</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                aria-label="تصفية حسب الشركة المصنعة"
                value={itemBrand}
                onChange={(e) => setItemBrand(e.target.value)}
              >
                <option value="">كل الشركات المصنعة</option>
                {manufacturers.map((manufacturer) => (
                  <option key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </option>
                ))}
              </select>
              <select
                aria-label="تصفية حسب الصور"
                value={photoFilter}
                onChange={(e) => setPhotoFilter(e.target.value)}
              >
                <option value="all">كل الصور</option>
                <option value="with">بصور</option>
                <option value="without">بدون صور</option>
              </select>
              <select
                aria-label="تصفية حسب حالة النشر"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="published">منشور</option>
                <option value="draft">مسودة</option>
              </select>
            </div>
            {hasFilters && (
              <button
                type="button"
                className={styles.clearFilters}
                onClick={() => {
                  setCarMake("");
                  setCarModel("");
                  setCarYear("");
                  setItemBrand("");
                  setPhotoFilter("all");
                  setStatusFilter("all");
                }}
              >
                مسح الفلاتر
              </button>
            )}
            <Link className="button secondary" href="/admin?module=products">
              <Plus size={15} /> إضافة منتج
            </Link>
            <div className={styles.products}>
              {filtered.map((p) => {
                const picture = images[p.id];
                return (
                  <Link
                    key={p.id}
                    href={`/admin?module=products&id=${encodeURIComponent(p.id)}&tab=${tab}`}
                    aria-current={selectedId === p.id ? "page" : undefined}
                  >
                    <span className={styles.thumb}>
                      {picture?.url ? (
                        <img src={picture.url} alt="" loading="lazy" />
                      ) : (
                        <Image size={20} aria-hidden="true" />
                      )}
                    </span>
                    <span className={styles.productInfo}>
                      <strong>{p.name.ar || p.name.en}</strong>
                      <small lang="en" dir="ltr">
                        {p.name.en}
                      </small>
                      <span className={styles.productMeta}>
                        <span>{p.sku}</span>
                        <span
                          className={
                            p.status === "published"
                              ? styles.published
                              : styles.draft
                          }
                        >
                          {p.status === "published" ? "منشور" : p.status === "draft" ? "مسودة" : p.status}
                        </span>
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
            {!filtered.length && (
              <p>
                {hasFilters || query
                  ? "مفيش منتجات مطابقة للفلاتر المحددة."
                  : "No products yet. إضافة منتج جديد to get started."}
              </p>
            )}
          </section>
          <div className="stack" id="product-editor">
            <div className={styles.context}>
              <div>
                <h2>{selected?.name.en || "إضافة منتج جديد"}</h2>
                <p>
                  {selected
                    ? "عدّل بيانات القطعة والعربيات المتوافقة والصور من هنا."
                    : "ابدأ ببيانات القطعة والعربيات المتوافقة، وبعد الحفظ أضف الصور."}
                </p>
              </div>
              {selected && (
                <DeleteProduct
                  id={selected.id}
                  label={`${selected.name.en} (${selected.sku})`}
                />
              )}
            </div>
            <nav
              className={styles.productTabs}
              aria-label="أدوات تعديل المنتج"
            >
              <button
                type="button"
                aria-current={tab === "details" ? "page" : undefined}
                onClick={() => navigate(view, "details")}
              >
                <Package size={17} />
                بيانات المنتج
              </button>
              <button
                type="button"
                aria-current={tab === "vehicles" ? "page" : undefined}
                onClick={() => navigate(view, "vehicles")}
              >
                <CarFront size={17} />
                العربيات والسنين
              </button>
              <button
                type="button"
                aria-current={tab === "photos" ? "page" : undefined}
                onClick={() => navigate(view, "photos")}
              >
                <Image size={17} />
                الصور
              </button>
            </nav>
            <div hidden={tab === "photos"}>
              <ProductEditorTab.Provider value={tab}>
                {editor}
              </ProductEditorTab.Provider>
            </div>
            <div hidden={tab !== "photos"}>
              {selected ? (
                photos
              ) : (
                <div className="panel stack">
                  <h2>Add product photos</h2>
                  <p>
                    Save the product’s details first. Then you can upload photos
                    here.
                  </p>
                  <button
                    type="button"
                    className="button"
                    onClick={() => navigate(view, "details")}
                  >
                    Enter product details
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div hidden={view !== "brands"}>
        <div className={styles.brandLayout}>
          <section className="panel stack">
            <h2>Your item brands</h2>
            <p>
              These are the brands of your spare parts, such as Bosch. Select
              them when creating a product.
            </p>
            <label>
              Search item brands
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Find a brand…"
              />
            </label>
            <div className={styles.brands}>
              {manufacturers
                .filter((m) =>
                  m.toLowerCase().includes(brandQuery.toLowerCase()),
                )
                .map((m) => (
                  <span key={m}>{m}</span>
                ))}
            </div>
          </section>
          <section className="panel stack">
            <h2>Add an item brand</h2>
            <ApiForm
              action="admin-taxonomy"
              label="Add item brand"
              extra={{
                json: JSON.stringify({
                  kind: "manufacturer",
                  name: newBrand.trim(),
                }),
              }}
            >
              <label>
                Item brand name
                <input
                  required
                  maxLength={100}
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                />
              </label>
            </ApiForm>
            <p>You can also add a new brand directly from the product form.</p>
          </section>
        </div>
      </div>
      <div hidden={view !== "excel"}>{excel}</div>
    </div>
  );
}

function DeleteProduct({ id, label }: { id: string; label: string }) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className={styles.deleteControl}>
      {!confirm ? (
        <button
          type="button"
          className={styles.deleteButton}
          onClick={() => {
            setConfirm(true);
            setError("");
          }}
        >
          Delete product
        </button>
      ) : (
        <div
          className={styles.confirm}
          role="group"
          aria-label={`Confirm deletion of ${label}`}
        >
          <p>Delete {label}? This cannot be undone.</p>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const response = await fetch("/api/admin-delete-product", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id }),
                  });
                  const result = await response.json();
                  if (!response.ok) throw Error(result.error);
                  router.push("/admin?module=products");
                  router.refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Unable to delete");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setConfirm(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
    </div>
  );
}
