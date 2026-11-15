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
      if (index < 0 || index + direction < 0 || index >= next.length || index + direction >= next.length) return current;
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  return (
    <div className="stack admin-hero-editor" lang="ar" dir="rtl">
      <section className="panel stack">
        <h2>صور الواجهة الرئيسية</h2>
        <p>
          ارفع حتى 10 صور أفقية. لتفعيل العرض المتحرك، فعّل صورتين على الأقل. أول صورة مفعّلة هتظهر في البداية. لو مفيش صور مفعّلة، الموقع هيستخدم الصورة الافتراضية. التعديلات مش هتظهر على الموقع إلا بعد الحفظ.
        </p>
        <label htmlFor="hero-uploads">رفع صور البانر</label>
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
                throw Error("الحد الأقصى للبانر 10 صور.");
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
              setMessage(`تم رفع ${added} صورة. اكتب الوصف بالعربي والإنجليزي واحفظ التعديلات.`);
            } catch (error) {
              setMessage(
                `${added ? `تم رفع ${added} صورة. ` : ""}${(error as Error).message}`,
              );
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
        <p role="status">{busy ? "جاري رفع الصور…" : message}</p>
        <ApiForm
          action="admin-hero-slides"
          disabled={busy}
          label="حفظ صور الواجهة الرئيسية"
          extra={{
            json: JSON.stringify({
              slides: slides.map(({ url, ...slide }) => slide),
              intervalSeconds,
              autoplay,
            }),
          }}
        >
          <label htmlFor="hero-interval">الفاصل بين الصور بالثواني (من 3 إلى 30)</label>
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
            تغيير الصور تلقائيًا
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
              <h3>الصورة {index + 1}</h3>
              {(["ar", "en"] as const).map((lang) => (
                <label key={lang}>
                  وصف الصورة {index + 1} · {lang === "ar" ? "عربي" : "إنجليزي"}
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
                تفعيل الصورة {index + 1}
              </label>
              <div className="admin-nav">
                <button
                  type="button"
                  disabled={busy || index === 0}
                  onClick={() => move(index, -1)}
                >
                  تحريك الصورة {index + 1} للأمام
                </button>
                <button
                  type="button"
                  disabled={busy || index === slides.length - 1}
                  onClick={() => move(index, 1)}
                >
                  تحريك الصورة {index + 1} للخلف
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setSlides((current) =>
                      current.filter((s) => s.id !== slide.id),
                    )
                  }
                >
                  حذف الصورة {index + 1}
                </button>
              </div>
            </article>
          ))}
          {!slides.length && (
            <p>مفيش صور مضافة حاليًا. الصورة الافتراضية هتفضل ظاهرة.</p>
          )}
        </ApiForm>
      </section>
      {preview.length > 0 && (
        <section className="stack">
          <h2>معاينة قبل الحفظ</h2>
          <div
            className="cinematic-intro hero-slideshow-preview admin-hero-desktop-preview"
            style={{ minHeight: 0 }}
          >
            <HeroSlideshow
              key={preview.map((s) => s.id).join(",")}
              slides={preview}
              locale="ar"
              intervalSeconds={
                Number.isFinite(intervalSeconds) ? intervalSeconds : 6
              }
              autoplay={autoplay}
            >
              <div style={{ height: 340, padding: "32px 24px", color: "#fff" }}>
                <h3>معاينة البانر</h3>
              </div>
            </HeroSlideshow>
          </div>
          <h3>معاينة الموبايل</h3>
          <div className="cinematic-intro hero-slideshow-preview admin-hero-mobile-preview">
            <HeroSlideshow
              key={"mobile-" + preview.map((slide) => slide.id).join(",")}
              slides={preview}
              locale="ar"
              intervalSeconds={Number.isFinite(intervalSeconds) ? intervalSeconds : 6}
              autoplay={autoplay}
            >
              <div style={{ height: 300, padding: "28px 18px", color: "#fff" }}>
                <h3>معاينة الموبايل</h3>
              </div>
            </HeroSlideshow>
          </div>
          <p className="muted">
            عنوان الواجهة والبحث هيفضلوا ظاهرين فوق الصور. الحركة بتقف مؤقتًا عند التفاعل أو الانتقال لتبويب تاني، وبتراعي إعدادات تقليل الحركة.
          </p>
        </section>
      )}
    </div>
  );
}
