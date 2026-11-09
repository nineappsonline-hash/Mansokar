import { LayoutDashboard } from "lucide-react";
import styles from "./recovery.module.css";
export default function AdminLoading() {
  return (
    <main className={styles.screen} lang="en" dir="ltr">
      <section className={styles.card} role="status" aria-live="polite">
        <LayoutDashboard size={30} />
        <h1>Loading your workspace</h1>
        <p>Getting the latest store information…</p>
        <div className={styles.loading} aria-hidden="true" />
      </section>
    </main>
  );
}
