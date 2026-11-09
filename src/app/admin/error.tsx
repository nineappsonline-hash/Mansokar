"use client";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import styles from "./recovery.module.css";
export default function AdminError({
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <main className={styles.screen} lang="en" dir="ltr">
      <section className={styles.card} role="alert">
        <RefreshCw size={30} />
        <h1>This section couldn’t be loaded</h1>
        <p>
          Please try again. If the problem continues, return to the overview and
          open another section.
        </p>
        <div className={styles.actions}>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
          <Link href="/admin">Back to overview</Link>
        </div>
      </section>
    </main>
  );
}
