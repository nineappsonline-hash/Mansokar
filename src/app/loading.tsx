import { BrandLogo } from "@/components/brand-logo";
import styles from "./loading.module.css";

export default function Loading() {
  return (
    <main className={styles.screen} aria-busy="true">
      <div className={styles.ambient} aria-hidden="true" />
      <div className={styles.cornerBrand} aria-hidden="true">
        MOPC <span>/ AUTO PARTS</span>
      </div>
      <div
        className={styles.panel}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className={styles.instrument}>
          <div className={styles.dial} aria-hidden="true">
            <span className={styles.orbit} />
            <span className={styles.arc} />
            <span className={styles.marker} />
            <span className={styles.crosshair} />
          </div>
          <div className={styles.brand}>
            <BrandLogo className={styles.logo} />
            <span
              className={styles.name}
              lang="ar"
              dir="rtl"
              aria-hidden="true"
            >
              موبِك
            </span>
          </div>
        </div>
        <div className={styles.copy}>
          <span className={styles.eyebrow} aria-hidden="true">
            PRECISION IN EVERY DETAIL
          </span>
          <h1 className={styles.ar} lang="ar" dir="rtl">
            لحظات ونكون معك.
          </h1>
          <h1 className={styles.en} lang="en" dir="ltr">
            A moment. Then you’re on your way.
          </h1>
          <p className={styles.ar} lang="ar" dir="rtl">
            نجهّز الصفحة لك
          </p>
          <p className={styles.en} lang="en" dir="ltr">
            Getting your page ready
          </p>
        </div>
        <div className={styles.indicator} aria-hidden="true">
          <span />
        </div>
      </div>
      <footer className={styles.footer} aria-hidden="true">
        <span className={styles.footerLine} />
        <span className={styles.ar} lang="ar" dir="rtl">
          القطعة الصح. من أول مرة.
        </span>
        <span className={styles.en} lang="en" dir="ltr">
          THE RIGHT PART. THE FIRST TIME.
        </span>
        <span className={styles.footerLine} />
      </footer>
    </main>
  );
}
