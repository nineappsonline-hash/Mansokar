"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { ApiForm } from "./forms";
import { CategoryImageEditor } from "./category-image-editor";
import styles from "./admin-categories.module.css";

type Category = {
  slug: string;
  name: { ar: string; en: string };
  description?: { ar?: string; en?: string };
};
type ImageRecord = {
  path: string;
  url?: string;
  alt: { ar: string; en: string };
};
export function AdminCategories({
  categories,
  images,
  products,
}: {
  categories: Category[];
  images: Record<string, ImageRecord>;
  products: { category?: string }[];
}) {
  const [selected, setSelected] = useState<string | null>(
    categories[0]?.slug || null,
  );
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descriptionAr, setDescriptionAr] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [slug, setSlug] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const category = categories.find((item) => item.slug === selected);
  useEffect(() => {
    setNameAr(category?.name.ar || "");
    setNameEn(category?.name.en || "");
    setDescriptionAr(category?.description?.ar || "");
    setDescriptionEn(category?.description?.en || "");
    setConfirmDelete(false);
    setError("");
  }, [
    category?.slug,
    category?.name.ar,
    category?.name.en,
    category?.description?.ar,
    category?.description?.en,
  ]);
  const count = category
    ? products.filter((item) => item.category === category.slug).length
    : 0;
  async function removeCategory() {
    if (!category || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/admin-category-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: JSON.stringify({ slug: category.slug }) }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error || "تعذر حذف الفئة");
      setSelected(null);
      setConfirmDelete(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "تعذر حذف الفئة");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <div className={styles.layout}>
      <section className={styles.listPanel}>
        <div className={styles.heading}>
          <div>
            <span className={styles.kicker}>تنظيم المنتجات</span>
            <h2>فئات قطع الغيار</h2>
          </div>
          <button
            type="button"
            className={styles.newButton}
            onClick={() => {
              setSelected(null);
              setSlug("");
              setNameAr("");
              setNameEn("");
              setDescriptionAr("");
              setDescriptionEn("");
              setConfirmDelete(false);
            }}
          >
            <Plus size={16} /> فئة جديدة
          </button>
        </div>
        <p className={styles.intro}>
          اختار فئة لتعديل بياناتها وصورتها. المنتجات المرتبطة بها هتفضل في نفس
          الفئة.
        </p>
        <div className={styles.categoryList}>
          {categories.map((item) => {
            const image = images[item.slug];
            const itemCount = products.filter(
              (product) => product.category === item.slug,
            ).length;
            return (
              <button
                type="button"
                key={item.slug}
                className={`${styles.categoryItem} ${selected === item.slug ? styles.selected : ""}`}
                onClick={() => setSelected(item.slug)}
                aria-current={selected === item.slug ? "true" : undefined}
              >
                <span className={styles.thumb}>
                  {image?.url ? (
                    <img src={image.url} alt="" />
                  ) : (
                    <span>{item.name.ar.charAt(0)}</span>
                  )}
                </span>
                <span className={styles.itemText}>
                  <strong>{item.name.ar}</strong>
                  <small>
                    {item.name.en} · {item.slug}
                  </small>
                </span>
                <span className={styles.count}>{itemCount} منتج</span>
              </button>
            );
          })}
        </div>
      </section>
      <div className={styles.editorColumn}>
        <section className={styles.editorPanel}>
          <div className={styles.heading}>
            <div>
              <span className={styles.kicker}>
                {category ? "تعديل الفئة" : "فئة جديدة"}
              </span>
              <h2>{category?.name.ar || "إضافة فئة"}</h2>
            </div>
          </div>
          <ApiForm
            key={category?.slug || "new"}
            action="admin-taxonomy"
            label={category ? "حفظ التعديلات" : "إضافة الفئة"}
            extra={{
              json: JSON.stringify({
                kind: "category",
                slug: category?.slug || slug.trim(),
                localized: { ar: nameAr.trim(), en: nameEn.trim() },
                description: {
                  ar: descriptionAr.trim(),
                  en: descriptionEn.trim(),
                },
              }),
            }}
          >
            <div className={styles.fields}>
              <label>
                الاسم بالعربية
                <input
                  required
                  maxLength={100}
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                />
              </label>
              <label>
                الاسم بالإنجليزية
                <input
                  required
                  maxLength={100}
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                />
              </label>
            </div>
            <div className={styles.fields}>
              <label>
                الوصف بالعربية
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={descriptionAr}
                  onChange={(e) => setDescriptionAr(e.target.value)}
                />
              </label>
              <label>
                الوصف بالإنجليزية
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={descriptionEn}
                  onChange={(e) => setDescriptionEn(e.target.value)}
                />
              </label>
            </div>
            <label>
              رمز الفئة في Excel
              <input
                required
                readOnly={Boolean(category)}
                dir="ltr"
                pattern="[a-z0-9-]+"
                maxLength={100}
                placeholder="oil-filters"
                value={category?.slug || slug}
                onChange={(e) =>
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
              />
            </label>
            {category && (
              <p className={styles.hint}>
                رمز الفئة ثابت للحفاظ على روابطها وملفات Excel الحالية.
              </p>
            )}
          </ApiForm>
          {category && (
            <div className={styles.deleteArea}>
              {count > 0 ? (
                <p>
                  الفئة مرتبطة بـ {count} منتج. انقل المنتجات لفئة أخرى قبل
                  حذفها.
                </p>
              ) : category.slug === "spare-parts" ? (
                <p>الفئة الأساسية محفوظة للنظام.</p>
              ) : !confirmDelete ? (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 size={16} /> حذف الفئة
                </button>
              ) : (
                <div className={styles.confirm}>
                  <span>هل تريد حذف «{category.name.ar}»؟</span>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={removeCategory}
                  >
                    تأكيد الحذف
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setConfirmDelete(false)}
                  >
                    إلغاء
                  </button>
                </div>
              )}
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
            </div>
          )}
        </section>
        {category && (
          <CategoryImageEditor
            key={category.slug}
            category={category}
            initial={images[category.slug]}
          />
        )}
      </div>
    </div>
  );
}
