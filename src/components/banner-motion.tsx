import type { ReactNode } from "react";

/**
 * Decorative storefront banners are static server-rendered content.
 * The previous client island hydrated a full IntersectionObserver solely to
 * release paused CSS keyframes; keep the same markup accessible with no JS.
 */
export function BannerMotion({
  children,
  className,
  label,
  labelledBy,
}: {
  children: ReactNode;
  className: string;
  label?: string;
  labelledBy?: string;
}) {
  return (
    <section
      className={className}
      aria-label={label}
      aria-labelledby={labelledBy}
      data-in-view="true"
    >
      {children}
    </section>
  );
}
