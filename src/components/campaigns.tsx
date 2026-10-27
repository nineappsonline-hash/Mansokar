import Link from "next/link";
import { configured, service, siteMedia } from "@/lib/db";
import type { Locale } from "@/lib/catalog";
import { Reveal } from "./motion-primitives";
export async function Campaigns({ locale }: { locale: Locale }) {
  if (!configured()) return null;
  const now = new Date().toISOString();
  const { data, error } = await service()
    .from("campaigns")
    .select("id,title,body,image,href")
    .eq("enabled", true)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  if (!data?.length) return null;
  const media = await siteMedia(data.map((c) => "campaign-" + c.id));
  return (
    <section
      className="shell section"
      aria-label={locale === "ar" ? "حملات المتجر" : "Store campaigns"}
    >
      <div className="three-col">
        {data.map((c, i) => (
          <Reveal key={c.id} delay={i * 0.1}>
            <article className="panel stack">
              {(media["campaign-" + c.id]?.url ?? c.image) && (
                <img
                  src={media["campaign-" + c.id]?.url ?? c.image}
                  alt=""
                  loading="lazy"
                  style={{ width: "100%", borderRadius: 12 }}
                />
              )}
              <h2>{c.title[locale]}</h2>
              <p>{c.body[locale]}</p>
              {c.href && (
                <Link className="button secondary" href={c.href}>
                  {locale === "ar" ? "عرض التفاصيل" : "View details"} ↗
                </Link>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
