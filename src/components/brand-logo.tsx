import Image from "next/image";
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
        <Image
          src={src || "/images/mopc/logo-dark.png"}
          alt={alt}
          width={360}
          height={120}
          sizes="180px"
          // Dynamic merchant media can use an external host not in Next image
          // remotePatterns. Keep it working; optimize the heavy local default.
          unoptimized={!original}
        />
      </span>
    </span>
  );
}
