"use client";
import { useState } from "react";
import { ApiForm } from "./forms";

type Category = { slug: string; name: { ar: string; en: string } };
type ImageRecord = {
  path: string;
  url?: string;
  alt: { ar: string; en: string };
};
export function CategoryImageEditor({
  categories,
  initial,
}: {
  categories: Category[];
  initial: Record<string, ImageRecord>;
}) {
  const [slug, setSlug] = useState(categories[0]?.slug || "");
  const [record, setRecord] = useState<ImageRecord | null>(
    initial[slug] || null,
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const category = categories.find((item) => item.slug === slug);
  const alt = record?.alt || {
    ar: category?.name.ar || "صورة الفئة",
    en: category?.name.en || "Category image",
  };
  return (
    <section className="panel stack">
      <h2>صور الفئات</h2>
      <p>
        ارفع صورة لكل فئة، ثم احفظها. هتظهر في صفحة الفئة وتصفح الفئات داخل
        العربية.
      </p>
      <label>
        الفئة
        <select
          value={slug}
          onChange={(e) => {
            const next = e.target.value;
            setSlug(next);
            setRecord(initial[next] || null);
            setMessage("");
          }}
        >
          {categories.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name.ar} · {item.name.en}
            </option>
          ))}
        </select>
      </label>
      {record?.url && (
        <img
          src={record.url}
          alt={alt.ar}
          width={400}
          height={230}
          style={{
            width: "min(100%, 400px)",
            height: "230px",
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
      )}
      <label>
        ارفع صورة
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy || !slug}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setMessage("");
            try {
              const form = new FormData();
              form.append("image", file);
              const response = await fetch("/api/upload?kind=site", {
                method: "POST",
                body: form,
              });
              const result = await response.json();
              if (!response.ok) throw Error(result.error);
              setRecord({ path: result.path, url: result.url, alt });
              setMessage("تم رفع الصورة. اضغط حفظ الصورة لإظهارها في المتجر.");
            } catch (error) {
              setMessage(
                error instanceof Error ? error.message : "تعذر رفع الصورة",
              );
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      <p role="status">{message}</p>
      <ApiForm
        action="admin-category-image"
        label="حفظ الصورة"
        disabled={busy || !slug}
        extra={{
          json: JSON.stringify({ slug, path: record?.path || null, alt }),
        }}
      >
        <label>
          وصف الصورة بالعربية
          <input
            required
            maxLength={500}
            value={alt.ar}
            onChange={(e) =>
              setRecord({
                path: record?.path || "",
                url: record?.url,
                alt: { ...alt, ar: e.target.value },
              })
            }
          />
        </label>
        <label>
          Image description in English
          <input
            required
            maxLength={500}
            value={alt.en}
            onChange={(e) =>
              setRecord({
                path: record?.path || "",
                url: record?.url,
                alt: { ...alt, en: e.target.value },
              })
            }
          />
        </label>
        {record?.path && (
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setRecord(null);
              setMessage("اضغط حفظ الصورة لإزالتها من الفئة.");
            }}
          >
            إزالة الصورة
          </button>
        )}
      </ApiForm>
    </section>
  );
}
