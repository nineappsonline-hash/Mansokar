"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Play each decorative entrance once, when the banner reaches the viewport. */
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
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      ref={ref}
      className={className}
      aria-label={label}
      aria-labelledby={labelledBy}
      data-in-view={visible}
    >
      {children}
    </section>
  );
}
