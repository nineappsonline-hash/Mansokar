"use client";
import { useState } from "react";
import { ApiForm } from "./forms";
import { HeroSlideshow } from "./hero-slideshow";
import type { Text } from "@/lib/catalog";
type Slide = {
  id: string;
  path: string;
  alt: Text;
  enabled: boolean;
  url: string;
};
export function HeroSlidesEditor({
  initial,
  intervalSeconds: initialInterval = 6,
  autoplay: initialAutoplay = true,
}: {
  initial: Slide[];
  intervalSeconds?: number;
  autoplay?: boolean;
}) {
  const [slides, setSlides] = useState(initial);
  const [intervalSeconds, setIntervalSeconds] = useState(initialInterval);
  const [autoplay, setAutoplay] = useState(initialAutoplay);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const preview = slides.filter((s) => s.enabled && s.url);
  const move = (index: number, direction: number) =>
    setSlides((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  return (
    <div className="stack">
      <section className="panel stack">
        <h2>Homepage hero slideshow</h2>
        <p>
          Upload up to 10 landscape photos. Enable at least two for rotation.
          The first enabled image appears first. With no enabled images, the
          existing hero artwork is used. Changes go live only after saving.
        </p>
        <label htmlFor="hero-uploads">Upload slideshow images</label>
        <input
          id="hero-uploads"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy || slides.length >= 10}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (!files.length) return;
            setBusy(true);
            setMessage("");
            let added = 0;
            try {
              if (slides.length + files.length > 10)
                throw Error("A slideshow can contain at most 10 images.");
              for (const file of files) {
                const form = new FormData();
                form.append("image", file);
                const response = await fetch("/api/upload?kind=site", {
                  method: "POST",
                  body: form,
                });
                const result = await response.json();
                if (!response.ok) throw Error(result.error);
                setSlides((current) => [
                  ...current,
                  {
                    id: crypto.randomUUID(),
                    path: result.path,
                    url: result.url,
                    enabled: true,
                    alt: { ar: "", en: "" },
                  },
                ]);
                added++;
              }
              setMessage(`${added} uploaded. Add descriptions and save.`);
            } catch (error) {
              setMessage(
                `${added ? added + " uploaded. " : ""}${(error as Error).message}`,
              );
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
        <p role="status">{busy ? "Uploading…" : message}</p>
        <ApiForm
          action="admin-hero-slides"
          disabled={busy}
          label="Save hero slideshow"
          extra={{
            json: JSON.stringify({
              slides: slides.map(({ url, ...slide }) => slide),
              intervalSeconds,
              autoplay,
            }),
          }}
        >
          <label htmlFor="hero-interval">Seconds between images (3–30)</label>
          <input
            id="hero-interval"
            type="number"
            min={3}
            max={30}
            required
            value={intervalSeconds}
            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
            />
            Rotate automatically
          </label>
          {slides.map((slide, index) => (
            <article className="panel stack" key={slide.id}>
              {slide.url && (
                <img
                  src={slide.url}
                  alt={slide.alt.en}
                  width={240}
                  height={135}
                  style={{ objectFit: "cover", maxWidth: "100%" }}
                />
              )}
              <h3>Slide {index + 1}</h3>
              {(["ar", "en"] as const).map((lang) => (
                <label key={lang}>
                  Slide {index + 1} description · {lang}
                  <input
                    required
                    minLength={1}
                    maxLength={500}
                    dir={lang === "ar" ? "rtl" : "ltr"}
                    value={slide.alt[lang]}
                    onChange={(e) =>
                      setSlides((current) =>
                        current.map((s) =>
                          s.id === slide.id
                            ? {
                                ...s,
                                alt: { ...s.alt, [lang]: e.target.value },
                              }
                            : s,
                        ),
                      )
                    }
                  />
                </label>
              ))}
              <label className="check">
                <input
                  type="checkbox"
                  checked={slide.enabled}
                  onChange={(e) =>
                    setSlides((current) =>
                      current.map((s) =>
                        s.id === slide.id
                          ? { ...s, enabled: e.target.checked }
                          : s,
                      ),
                    )
                  }
                />
                Enable slide {index + 1}
              </label>
              <div className="admin-nav">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Move slide {index + 1} earlier
                </button>
                <button
                  type="button"
                  disabled={index === slides.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Move slide {index + 1} later
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSlides((current) =>
                      current.filter((s) => s.id !== slide.id),
                    )
                  }
                >
                  Remove slide {index + 1}
                </button>
              </div>
            </article>
          ))}
          {!slides.length && (
            <p>No slides yet. The current hero image is the fallback.</p>
          )}
        </ApiForm>
      </section>
      {preview.length > 0 && (
        <section className="stack">
          <h2>Unsaved slideshow preview</h2>
          <div
            className="cinematic-intro hero-slideshow-preview"
            style={{ minHeight: 0 }}
          >
            <HeroSlideshow
              key={preview.map((s) => s.id).join(",")}
              slides={preview}
              locale="en"
              intervalSeconds={
                Number.isFinite(intervalSeconds) ? intervalSeconds : 6
              }
              autoplay={autoplay}
            >
              <div style={{ height: 340, padding: "32px 24px", color: "#fff" }}>
                <h3>Slideshow preview</h3>
              </div>
            </HeroSlideshow>
          </div>
          <p className="muted">
            The live headline and search remain over these images. Rotation
            pauses while hovering, focusing or viewing another browser tab, and
            respects reduced-motion preferences.
          </p>
        </section>
      )}
    </div>
  );
}
