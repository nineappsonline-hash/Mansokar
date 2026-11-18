import { ArrowUpRight, Smartphone } from "lucide-react";
import type { Locale } from "@/lib/catalog";
import { INSTAPAY_URL } from "@/lib/payments";
import styles from "./instapay-button.module.css";

export function InstaPayButton({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  return (
    <a
      className={styles.link}
      href={INSTAPAY_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        ar
          ? "فتح رابط إنستاباي في نافذة جديدة"
          : "Open InstaPay link in a new tab"
      }
    >
      <span className={styles.icon} aria-hidden="true">
        <Smartphone size={21} />
      </span>
      <span>{ar ? "فتح رابط إنستاباي" : "Open InstaPay link"}</span>
      <ArrowUpRight className={styles.arrow} size={20} aria-hidden="true" />
    </a>
  );
}
