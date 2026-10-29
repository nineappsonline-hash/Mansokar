import { BrandLogo } from "@/components/brand-logo";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main className={styles.screen} aria-busy="true">
      <div className={styles.panel} role="status" aria-live="polite">
        <BrandLogo className={styles.logo} />
        <div className={styles.name} lang="ar" dir="rtl">
          موبِك
        </div>
        <div className={styles.indicator} aria-hidden="true">
          <span />
        </div>
        <div className={styles.copy}>
          <p className={styles.ar} lang="ar" dir="rtl">
            نجهّز الصفحة لك
          </p>
          <p className={styles.en} lang="en" dir="ltr">
            Getting your page ready
          </p>
          <span className={`${styles.detail} ${styles.ar}`} lang="ar" dir="rtl">
            لحظات ونكون معك
          </span>
          <span className={`${styles.detail} ${styles.en}`} lang="en" dir="ltr">
            We’ll be with you in a moment
          </span>
        </div>
      </div>
      <span className={styles.signature} aria-hidden="true">
        MOPC
      </span>
    </main>
  );
}
