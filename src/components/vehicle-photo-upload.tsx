"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Upload } from "lucide-react";
import styles from "./vehicle-photo-upload.module.css";

type Photo = { url: string; alt: { ar: string; en: string } };
export function VehiclePhotoUpload({
  slot,
  title,
  name,
  initial,
  fallback,
}: {
  slot: string;
  title: string;
  name: { ar: string; en: string };
  initial?: Photo;
  fallback?: string;
}) {
  const router = useRouter();
  const [url, setUrl] = useState(initial?.url || fallback);
  const [assigned, setAssigned] = useState(Boolean(initial));
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const alt = { ar: `صورة ${name.ar}`, en: `${name.en} vehicle photo` };
  async function assign(path: string | null) {
    const response = await fetch("/api/admin-site-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, path, alt }),
    });
    const result = await response.json();
    if (!response.ok)
      throw Error(result.error || "Unable to save vehicle photo");
  }
  async function upload(files: File[]) {
    if (busy || !files.length) return;
    if (files.length !== 1) {
      setMessage("Choose one vehicle photo at a time.");
      return;
    }
    const file = files[0];
    setBusy(true);
    setMessage("Uploading and saving photo…");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
        throw Error("Choose a JPG, PNG or WebP photo.");
      if (file.size > 5_000_000) throw Error("Maximum photo size is 5 MB.");
      const data = new FormData();
      data.append("image", file);
      const response = await fetch("/api/upload?kind=site", {
        method: "POST",
        body: data,
      });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || "Photo upload failed");
      await assign(result.path);
      setUrl(result.url);
      setAssigned(true);
      setMessage("Photo saved. It is now used on the storefront.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to upload photo",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel} aria-label={title}>
      <div>
        <h3>{title}</h3>
        <p>
          {name.en} · Upload one photo for this{" "}
          {slot.startsWith("brand-") ? "make" : "model"}.
        </p>
      </div>
      <div className={styles.content}>
        <div className={styles.preview}>
          {url ? (
            <img src={url} alt={alt.en} />
          ) : (
            <div>
              <ImagePlus size={30} />
              <span>No photo added</span>
            </div>
          )}
        </div>
        <div className="stack">
          <div
            className={`${styles.drop} ${dragging ? styles.active : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void upload(Array.from(e.dataTransfer.files));
            }}
            aria-busy={busy}
          >
            <Upload size={22} aria-hidden="true" />
            <strong>
              {busy ? "Saving photo…" : "Drag & drop a photo here"}
            </strong>
            <label className={styles.browse}>
              {busy ? "Please wait…" : "Browse photos"}
              <input
                aria-label={`Upload ${name.en} photo`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(e) => {
                  const files = Array.from(e.currentTarget.files || []);
                  e.currentTarget.value = "";
                  void upload(files);
                }}
              />
            </label>
            <small>JPG, PNG or WebP · up to 5 MB · saves automatically</small>
          </div>
          {assigned && (
            <button
              type="button"
              className={styles.remove}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setMessage("Restoring default photo…");
                try {
                  await assign(null);
                  setUrl(fallback);
                  setAssigned(false);
                  setMessage("Default photo restored.");
                  router.refresh();
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Unable to remove photo",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove uploaded photo / restore default
            </button>
          )}
        </div>
      </div>
      <p role="status" className={styles.message}>
        {message}
      </p>
    </section>
  );
}
