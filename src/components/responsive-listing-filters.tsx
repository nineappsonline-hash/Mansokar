"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

export function ResponsiveListingFilters({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const sync = () => { if (ref.current) ref.current.open = desktop.matches; };
    sync();
    desktop.addEventListener("change", sync);
    return () => desktop.removeEventListener("change", sync);
  }, []);
  return (
    <details ref={ref} className="listing-responsive-filters">
      <summary><SlidersHorizontal size={18} aria-hidden="true" />{label}</summary>
      {children}
    </details>
  );
}
