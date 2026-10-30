"use client";
import { motion, useReducedMotion } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Seconds to wait before the entrance starts; stagger grids with index * 0.06. */
  delay?: number;
  /** Rise distance in px. */
  y?: number;
  /** Entrance blur in px. Set to 0 for large sections where blur is costly. */
  blur?: number;
  /** Slight scale-up as the element settles into place. */
  scale?: number;
  as?: "div" | "section" | "article" | "li";
  className?: string;
  style?: HTMLAttributes<HTMLElement>["style"];
  id?: string;
};

/**
 * Entrance animation that fires once when the element enters the viewport.
 * Content must remain legible for people who disable JavaScript: the root
 * layout ships a <noscript> style that restores [data-motion-reveal].
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  blur = 5,
  scale = 0.988,
  as = "div",
  className,
  style,
  id,
}: RevealProps) {
  const reduced = useReducedMotion();
  const M = motion[as];
  if (reduced) {
    return (
      <M
        className={className}
        style={style}
        id={id}
        data-motion-reveal
        initial={false}
      >
        {children}
      </M>
    );
  }
  return (
    <M
      className={className}
      style={style}
      id={id}
      data-motion-reveal
      initial={{
        opacity: 0,
        y,
        scale,
        filter: `blur(${blur}px)`,
      }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{
        duration: 0.72,
        delay,
        ease: [0.22, 1, 0.36, 1],
        opacity: { duration: 0.55, delay },
      }}
    >
      {children}
    </M>
  );
}
