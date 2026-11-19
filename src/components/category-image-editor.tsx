"use client";
import { useRef, useState } from "react";
import { ApiForm } from "./forms";

type Category = { slug: string; name: { ar: string; en: string } };
type ImageRecord = {
  path: string;
  url?: string;
  alt: { ar: string; en: string };
};
export function CategoryImageEditor({
  category,
  initial,
}: {
  category: Category;
  initial?: ImageRecord;
}) {
  const [record, setRecord] = useState<ImageRecord | null>(initial || null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const alt = record?.alt || { ar: category.name.ar, en: category.name.en };
  async function upload(file: File) {
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
      if (!response.ok) throw Error(result.error || "تعذر رفع الصورة");
      setRecord({ path: result.path, url: result.url, alt });
      setMessage("تم رفع الصورة. اضغط حفظ الصورة لإظهارها في المتجر.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر رفع الصورة");
    } finally {
      setBusy(false);
      setDragging(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <section className="panel stack category-image-editor" lang="ar" dir="rtl">
      <h2>صورة {category.name.ar}</h2>
      <p>اسحب الصورة هنا أو اختارها من جهازك. اضغط حفظ الصورة بعد الرفع.</p>
      {record?.url && (
        <img
          src={record.url}
          alt={alt.ar}
          width={440}
          height={230}
          style={{
            width: "min(100%, 440px)",
            height: 230,
            objectFit: "cover",
            borderRadius: 12,
          }}
        />
      )}
      <div
        className={`category-image-dropzone ${dragging ? "is-dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node))
            setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const file = e.dataTransfer.files[0];
          if (file && !busy) void upload(file);
        }}
      >
        <strong>اسحب صورة الفئة هنا</strong>
        <span>JPG أو PNG أو WebP · حتى 5 ميجابايت</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          اختيار صورة
        </button>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          aria-label={`اختيار صورة ${category.name.ar}`}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
      </div>
      <p role="status">{message}</p>
      <ApiForm
        action="admin-category-image"
        label="حفظ الصورة"
        disabled={busy}
        extra={{
          json: JSON.stringify({
            slug: category.slug,
            path: record?.path || null,
            alt,
          }),
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
          وصف الصورة بالإنجليزية
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
