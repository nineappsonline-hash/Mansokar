import styles from "./brand-logo.module.css";

/** Frame the original mark above its tagline, preserving the supplied lettering. */
export function BrandLogo({
  className = "",
  src,
  alt = "MOPC · موبِك",
}: {
  className?: string;
  src?: string;
  alt?: string;
}) {
  const original = !src || src === "/images/mopc/logo-dark.png";
  return (
    <span className={`${styles.root} ${className}`}>
      <span className={original ? styles.mark : styles.full}>
        <img
          src={src || "/images/mopc/logo-dark.png"}
          alt={alt}
          width={2172}
          height={724}
        />
      </span>
    </span>
  );
}
