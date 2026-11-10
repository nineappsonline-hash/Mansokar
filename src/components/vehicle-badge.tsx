import { CarFront } from "lucide-react";
import type { Locale } from "@/lib/catalog";
import { vehicleBrandLogo } from "@/lib/vehicle-brand-logo";
import styles from "./vehicle-badge.module.css";

export function VehicleBadge({
  locale,
  make,
  model,
  years,
  brand,
  logo,
  size = "compact",
  className = "",
}: {
  locale: Locale;
  make?: string;
  model: string;
  years?: string;
  brand?: string;
  logo?: string;
  size?: "compact" | "large";
  className?: string;
}) {
  const mark = logo ?? vehicleBrandLogo(brand);
  return (
    <div
      className={`${styles.badge} ${styles[size]} ${className}`}
      aria-label={[make, model, years].filter(Boolean).join(" · ")}
    >
      <span className={styles.emblem}>
        {mark ? (
          <img
            src={mark}
            alt=""
            width={size === "large" ? 30 : 22}
            height={size === "large" ? 30 : 22}
            loading="lazy"
          />
        ) : (
          <CarFront size={size === "large" ? 22 : 16} aria-hidden="true" />
        )}
      </span>
      <span className={styles.copy}>
        {make && (
          <span className={styles.make} dir="auto">
            {make}
          </span>
        )}
        <strong className={styles.model} dir="auto">
          {model}
        </strong>
      </span>
      {years && (
        <bdi className={styles.years} dir="ltr">
          {years}
        </bdi>
      )}
    </div>
  );
}
