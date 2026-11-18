import styles from "./original-badge.module.css";
import { BadgeCheck } from "lucide-react";
import type { Locale } from "@/lib/catalog";

export function OriginalBadge({ locale }: { locale: Locale }) {
  return (
    <div className={`original-badge ${styles.badge}`}>
      <BadgeCheck size={14} strokeWidth={2.4} aria-hidden="true" />
      <span>{locale === "ar" ? "أصلي" : "Original"}</span>
    </div>
  );
}
