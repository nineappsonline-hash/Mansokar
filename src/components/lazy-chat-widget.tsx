"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";
import type { Locale } from "@/lib/catalog";
import styles from "./chat-widget.module.css";

// Load the full contact form only when someone actually opens support.
const ContactPanel = dynamic(
  () => import("./chat-widget").then((module) => module.ChatWidget),
  { ssr: false },
);

export function LazyChatWidget({ locale, enabled }: { locale: Locale; enabled: boolean }) {
  const [opened, setOpened] = useState(false);
  if (opened) {
    return <ContactPanel locale={locale} enabled={enabled} initiallyOpen />;
  }
  return (
    <div className={styles.launcherWrap}>
      <button
        className={styles.launcher}
        type="button"
        aria-expanded={false}
        aria-label={locale === "ar" ? "تواصل معنا" : "Chat with us"}
        onClick={() => setOpened(true)}
      >
        <span className={styles.launcherIcon}>
          <MessageCircle size={21} aria-hidden="true" />
        </span>
        {locale === "ar" ? "تواصل معنا" : "Chat with us"}
      </button>
    </div>
  );
}
