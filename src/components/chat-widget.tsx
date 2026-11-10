"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, CheckCircle2, MessageCircle, Send, X } from "lucide-react";
import type { Locale } from "@/lib/catalog";
import styles from "./chat-widget.module.css";

export function ChatWidget({
  locale,
  enabled,
}: {
  locale: Locale;
  enabled: boolean;
}) {
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const launcher = useRef<HTMLButtonElement>(null);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstField.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        launcher.current?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !enabled) return;
    const form = event.currentTarget;
    setBusy(true);
    setFailed(false);
    setFeedback("");
    try {
      const fields = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields, ui_locale: locale }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      form.reset();
      setSent(true);
      setFeedback(data.message);
    } catch (error) {
      setFailed(true);
      setFeedback(
        error instanceof Error
          ? error.message
          : ar
            ? "تعذر إرسال الرسالة. حاول مرة أخرى."
            : "Unable to send the message. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={styles.launcherWrap}>
        <button
          ref={launcher}
          type="button"
          className={styles.launcher}
          aria-expanded={open}
          aria-controls="storefront-chat"
          onClick={() => setOpen((value) => !value)}
        >
          <span className={styles.launcherIcon}>
            {open ? <X size={20} /> : <MessageCircle size={21} />}
          </span>
          {ar ? "تواصل معنا" : "Chat with us"}
        </button>
      </div>
      {open && (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            ref={panel}
            id="storefront-chat"
            role="dialog"
            aria-modal="true"
            aria-labelledby="storefront-chat-title"
            className={styles.panel}
          >
            <header className={styles.head}>
              <span className={styles.bot}>
                <Bot size={23} />
              </span>
              <div className={styles.headCopy}>
                <span className={styles.kicker}>
                  {ar ? "مساعد موبِك" : "MOPC assistant"}
                </span>
                <h2 id="storefront-chat-title">
                  {ar ? "تواصل معنا" : "Contact us"}
                </h2>
                <p>
                  {ar
                    ? "ابعت بياناتك ورسالتك وفريق المتجر هيتواصل معاك."
                    : "Send your details and message and our store team will get back to you."}
                </p>
              </div>
              <button
                type="button"
                className={styles.close}
                aria-label={ar ? "إغلاق المحادثة" : "Close chat"}
                onClick={close}
              >
                <X size={18} />
              </button>
            </header>
            {sent ? (
              <div className={styles.success} aria-live="polite">
                <span className={styles.successIcon}>
                  <CheckCircle2 size={26} />
                </span>
                <h3>{ar ? "وصلتنا رسالتك" : "Message received"}</h3>
                <p>{feedback}</p>
                <button
                  type="button"
                  className={styles.submit}
                  onClick={() => {
                    setSent(false);
                    setFeedback("");
                    requestAnimationFrame(() => firstField.current?.focus());
                  }}
                >
                  {ar ? "إرسال رسالة أخرى" : "Send another message"}
                </button>
              </div>
            ) : (
              <form className={styles.form} onSubmit={submit}>
                <label>
                  {ar ? "الاسم" : "Name"}
                  <input
                    ref={firstField}
                    name="name"
                    required
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    disabled={busy}
                  />
                </label>
                <label>
                  {ar ? "رقم الموبايل" : "Phone number"}
                  <input
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    dir="ltr"
                    required
                    pattern="01[0125][0-9]{8}"
                    maxLength={11}
                    placeholder="01xxxxxxxxx"
                    autoComplete="tel-national"
                    disabled={busy}
                  />
                </label>
                <label>
                  {ar ? "البريد الإلكتروني" : "Email"}
                  <input
                    name="email"
                    type="email"
                    dir="ltr"
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="name@example.com"
                    disabled={busy}
                  />
                </label>
                <label>
                  {ar ? "رسالتك" : "Your message"}
                  <textarea
                    name="body"
                    required
                    minLength={10}
                    maxLength={3000}
                    rows={5}
                    disabled={busy}
                  />
                </label>
                <button
                  type="submit"
                  className={styles.submit}
                  disabled={busy || !enabled}
                >
                  <Send size={16} />
                  {busy
                    ? ar
                      ? "جاري الإرسال…"
                      : "Sending…"
                    : ar
                      ? "إرسال الرسالة"
                      : "Send message"}
                </button>
                {feedback && (
                  <p
                    role={failed ? "alert" : "status"}
                    className={failed ? styles.error : styles.status}
                  >
                    {feedback}
                  </p>
                )}
                {!enabled && (
                  <p role="status" className={styles.status}>
                    {ar
                      ? "نموذج التواصل غير متاح حاليًا. يُرجى المحاولة لاحقًا."
                      : "The contact form is currently unavailable. Please try again later."}
                  </p>
                )}
              </form>
            )}
          </section>
        </div>
      )}
    </>
  );
}
