"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Package,
  Search,
  Plus,
  Image,
  CarFront,
  Tags,
  FileSpreadsheet,
} from "lucide-react";
import { ApiForm } from "./forms";
import { ProductEditorTab } from "./product-editor-context";
import styles from "./admin-products.module.css";
export function AdminProducts({
  products,
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
    status: string;
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
    [brandQuery, setBrandQuery] = useState("");
  const selected = products.find((p) => p.id === selectedId);
  const filtered = products.filter((p) =>
    `${p.sku} ${p.name.en} ${p.name.ar}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <div className="stack">
      <nav className={styles.tabs} aria-label="Product workspace">
        <button
          type="button"
          aria-current={view === "products" ? "page" : undefined}
          onClick={() => setView("products")}
        >
          <Package size={17} />
          Products <span>{products.length}</span>
        </button>
        <button
          type="button"
          aria-current={view === "brands" ? "page" : undefined}
          onClick={() => setView("brands")}
        >
          <Tags size={17} />
          Item brands
        </button>
        <button
          type="button"
          aria-current={view === "excel" ? "page" : undefined}
          onClick={() => setView("excel")}
        >
          <FileSpreadsheet size={17} />
          Excel import & export
        </button>
      </nav>
      <div hidden={view !== "products"}>
        <div className={styles.layout}>
          <section className="panel stack">
            <div className={styles.listHeading}>
              <h2>Your products</h2>
              <Link
                href="/admin?module=products"
                aria-label="Create a new product"
              >
                <Plus size={19} />
              </Link>
            </div>
            <label className={styles.search}>
              <Search size={16} />
              <input
                aria-label="Search products"
                placeholder="Search name or SKU…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <Link className="button secondary" href="/admin?module=products">
              <Plus size={15} /> New product
            </Link>
            <div className={styles.products}>
              {filtered.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin?module=products&id=${encodeURIComponent(p.id)}&tab=${tab}`}
                  aria-current={selectedId === p.id ? "page" : undefined}
                >
                  <strong>{p.name.en}</strong>
                  <small lang="ar" dir="rtl">
                    {p.name.ar}
                  </small>
                  <span>
                    <span>{p.sku}</span>
                    <span
                      className={
                        p.status === "published"
                          ? styles.published
                          : styles.draft
                      }
                    >
                      {p.status}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            {!filtered.length && (
              <p>
                No products found. Try another name or create a new product.
              </p>
            )}
          </section>
          <div className="stack">
            <div className={styles.context}>
              <div>
                <h2>{selected?.name.en || "Create a product"}</h2>
                <p>
                  {selected
                    ? "Manage this product’s details, cars and photos below."
                    : "Start with the part details and cars it fits. Save once, then add its photos."}
                </p>
              </div>
            </div>
            <nav
              className={styles.productTabs}
              aria-label="Selected product tools"
            >
              <button
                type="button"
                aria-current={tab === "details" ? "page" : undefined}
                onClick={() => setTab("details")}
              >
                <Package size={17} />
                Product details
              </button>
              <button
                type="button"
                aria-current={tab === "vehicles" ? "page" : undefined}
                onClick={() => setTab("vehicles")}
              >
                <CarFront size={17} />
                Cars & years
              </button>
              <button
                type="button"
                aria-current={tab === "photos" ? "page" : undefined}
                onClick={() => setTab("photos")}
              >
                <Image size={17} />
                Photos
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
                    onClick={() => setTab("details")}
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
                  name: brandQuery.trim(),
                }),
              }}
            >
              <label>
                Item brand name
                <input
                  required
                  maxLength={100}
                  value={brandQuery}
                  onChange={(e) => setBrandQuery(e.target.value)}
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
